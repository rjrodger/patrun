// Package patrun provides a fast pattern matcher on map[string]string properties.
//
// Patterns are sets of key-value pairs. A pattern matches a query if all
// keys in the pattern are present in the query with the same values.
// When multiple patterns match, the most specific (most keys matched) wins.
package patrun

import (
	"encoding/json"
	"sort"
	"strings"

	gex "github.com/rjrodger/gex/go"
)

const Version = "0.1.0"

// Matcher produces MatchValues for pattern values that it recognises.
type Matcher interface {
	Make(key, fix string) (MatchValue, bool)
}

// MatchValue represents a non-literal match (gex glob, interval, etc.).
type MatchValue interface {
	Match(val string) bool
	Same(other MatchValue) bool
	Kind() string
	Fix() string
	Keymap() *keymap
	SetKeymap(km *keymap)
}

// Options configures a Patrun instance.
type Options struct {
	Gex      bool
	Interval bool
}

// ListEntry is one result from List.
type ListEntry struct {
	Match map[string]string
	Data  string
}

// keymap is the internal trie node.
type keymap struct {
	k string            // current key name
	v map[string]*keymap // value -> sub-trie (exact matches)
	s *keymap            // star path (skip this key)
	g map[string][]MatchValue // gex/interval matchers per key
	d *string           // data stored here (nil = no data)
}

// Patrun is the main pattern matcher.
type Patrun struct {
	top      *keymap
	matchers []Matcher
}

// New creates a new Patrun instance with the given options.
func New(opts ...Options) *Patrun {
	var o Options
	if len(opts) > 0 {
		o = opts[0]
	}

	p := &Patrun{
		top: &keymap{},
	}

	if o.Gex {
		p.matchers = append(p.matchers, &GexMatcher{})
	}
	if o.Interval {
		p.matchers = append(p.matchers, &IntervalMatcher{})
	}

	return p
}

// Top returns the internal top-level keymap (for inspection).
func (p *Patrun) Top() *keymap {
	return p.top
}

// Add inserts a pattern with associated data.
func (p *Patrun) Add(pat map[string]string, data *string) *Patrun {
	// Copy and sort keys, filter out empty-key entries with nil values
	keys := make([]string, 0, len(pat))
	for k, v := range pat {
		_ = v
		keys = append(keys, k)
	}
	sort.Strings(keys)

	km := p.top

	for i := 0; i < len(keys); {
		key := keys[i]
		fix := pat[key]

		// Try matchers
		var mv MatchValue
		for _, m := range p.matchers {
			if v, ok := m.Make(key, fix); ok {
				mv = v
				break
			}
		}

		if km.v != nil && key == km.k {
			// Existing key matches
			if mv != nil {
				km = p.addMV(km, key, mv)
			} else {
				if km.v[fix] == nil {
					km.v[fix] = &keymap{}
				}
				km = km.v[fix]
			}
			i++
		} else if km.k == "" {
			// End of key path, new key
			km.k = key
			km.v = make(map[string]*keymap)

			if mv != nil {
				km = p.addMV(km, key, mv)
			} else {
				km.v[fix] = &keymap{}
				km = km.v[fix]
			}
			i++
		} else if key < km.k {
			// Insert before existing key
			oldS := km.s
			oldG := km.g

			km.s = &keymap{
				k: km.k,
				v: km.v,
			}

			if oldS != nil {
				km.s.s = oldS
			}
			if oldG != nil {
				km.s.g = oldG
			}

			if km.g != nil {
				km.g = nil
			}

			km.k = key
			km.v = make(map[string]*keymap)

			if mv != nil {
				km = p.addMV(km, key, mv)
			} else {
				km.v[fix] = &keymap{}
				km = km.v[fix]
			}
			i++
		} else {
			// Follow star path
			if km.s == nil {
				km.s = &keymap{}
			}
			km = km.s
			// Don't increment i - key not yet inserted
		}
	}

	if km != nil {
		km.d = data
	}

	return p
}

func (p *Patrun) addMV(km *keymap, key string, mv MatchValue) *keymap {
	if km.g == nil {
		km.g = make(map[string][]MatchValue)
	}
	ga := km.g[key]

	// Check if same matcher already exists
	for _, existing := range ga {
		if existing.Same(mv) {
			return existing.Keymap()
		}
	}

	km.g[key] = append(ga, mv)
	newKM := &keymap{}
	mv.SetKeymap(newKM)
	return newKM
}

// Find looks up a pattern. Returns the data string and whether it was found.
func (p *Patrun) Find(pat map[string]string) (*string, bool) {
	result, _ := p.find(pat, false, false)
	if result == nil {
		return nil, false
	}
	return result, true
}

// FindExact looks up a pattern with exact matching (all keys must match).
func (p *Patrun) FindExact(pat map[string]string) (*string, bool) {
	result, _ := p.find(pat, true, false)
	if result == nil {
		return nil, false
	}
	return result, true
}

// Collect returns all matching data from wider to narrower patterns.
func (p *Patrun) Collect(pat map[string]string) []string {
	_, collection := p.find(pat, false, true)
	return collection
}

func (p *Patrun) find(pat map[string]string, exact bool, collect bool) (*string, []string) {
	if pat == nil {
		return nil, nil
	}

	km := p.top
	var data *string
	if km.d != nil {
		data = km.d
	}

	var stars []*keymap
	foundkeys := make(map[string]bool)
	patlen := len(pat)
	var collection []string

	if km.d != nil {
		collection = append(collection, *km.d)
	}

	for km != nil {
		key := km.k

		if km.v != nil {
			val, hasVal := pat[key]
			_ = hasVal

			// Try exact match first
			nextkm := km.v[val]

			// Try gex/interval matchers
			if nextkm == nil && km.g != nil {
				if ga, ok := km.g[key]; ok {
					for _, mv := range ga {
						if mv.Match(val) {
							nextkm = mv.Keymap()
							break
						}
					}
				}
			}

			if nextkm != nil {
				foundkeys[key] = true

				if km.s != nil {
					stars = append(stars, km.s)
				}

				if nextkm.d != nil {
					data = nextkm.d
				} else if exact {
					data = nil
				}
				// else: keep previous data (wider match)

				if collect && nextkm.d != nil {
					collection = append(collection, *nextkm.d)
				}

				km = nextkm
			} else {
				// No match, follow star trail
				km = km.s
			}
		} else {
			km = nil
		}

		if km == nil && len(stars) > 0 && (data == nil || (collect && !exact)) {
			km = stars[len(stars)-1]
			stars = stars[:len(stars)-1]
		}
	}

	if exact {
		if len(foundkeys) != patlen {
			data = nil
		}
	} else {
		// Root data catch-all
		if data == nil && p.top.d != nil {
			data = p.top.d
		}
	}

	if collect {
		return data, collection
	}
	return data, nil
}

// Remove deletes data associated with a pattern.
func (p *Patrun) Remove(pat map[string]string) {
	km := p.top
	var data *string

	type pathEntry struct {
		km *keymap
		v  string
		mv MatchValue
	}

	var path []pathEntry

	for km != nil {
		key := km.k

		if km.v != nil || km.g != nil {
			var nextkm *keymap

			if km.v != nil {
				if nk, ok := km.v[pat[key]]; ok {
					path = append(path, pathEntry{km: km, v: pat[key]})
					nextkm = nk
				}
			}

			if nextkm == nil && km.g != nil {
				if mvs, ok := km.g[key]; ok {
					for _, mv := range mvs {
						if mv.Fix() == pat[key] {
							path = append(path, pathEntry{km: km, v: pat[key], mv: mv})
							nextkm = mv.Keymap()
							break
						}
					}
				}
			}

			if nextkm != nil {
				data = nextkm.d
				km = nextkm
			} else {
				km = km.s
			}
		} else {
			km = nil
		}
	}

	if data != nil && len(path) > 0 {
		part := path[len(path)-1]
		if part.km != nil && part.km.v != nil {
			var point *keymap
			if part.mv != nil {
				point = part.mv.Keymap()
			} else {
				point = part.km.v[part.v]
			}
			if point != nil {
				point.d = nil
			}
		}
	}
}

// List returns all patterns matching a filter. An empty/nil filter returns all.
func (p *Patrun) List(pat map[string]string) []ListEntry {
	if pat == nil {
		pat = map[string]string{}
	}

	var acc []ListEntry

	if p.top.d != nil {
		acc = append(acc, ListEntry{
			Match: map[string]string{},
			Data:  *p.top.d,
		})
	}

	p.listDescend(p.top, pat, make(map[string]string), copyMap(pat), &acc)
	return acc
}

func (p *Patrun) listDescend(km *keymap, pat map[string]string, match map[string]string, missing map[string]string, acc *[]ListEntry) {
	if km.v == nil {
		return
	}

	key := km.k

	// Get sorted values for deterministic ordering
	vals := make([]string, 0, len(km.v))
	for v := range km.v {
		vals = append(vals, v)
	}
	sort.Strings(vals)

	patVal, patHasKey := pat[key]

	for _, val := range vals {
		// Check if this value matches the filter
		if val == patVal || !patHasKey {
			iterMatch := copyMap(match)
			iterMatch[key] = val

			iterMissing := copyMap(missing)
			delete(iterMissing, key)

			nextkm := km.v[val]

			if len(iterMissing) == 0 && nextkm != nil && nextkm.d != nil {
				*acc = append(*acc, ListEntry{
					Match: copyMap(iterMatch),
					Data:  *nextkm.d,
				})
			}

			if nextkm != nil && nextkm.v != nil {
				p.listDescend(nextkm, pat, iterMatch, iterMissing, acc)
			}
		}
	}

	// Follow star path
	if km.s != nil {
		p.listDescend(km.s, pat, copyMap(match), copyMap(missing), acc)
	}
}

func copyMap(m map[string]string) map[string]string {
	c := make(map[string]string, len(m))
	for k, v := range m {
		c[k] = v
	}
	return c
}

// String returns a human-readable representation.
func (p *Patrun) String() string {
	var str []string
	p.walk(p.top, nil, &str)
	return strings.Join(str, "\n")
}

func (p *Patrun) walk(n *keymap, vs []string, str *[]string) {
	if n.d != nil {
		*str = append(*str, strings.Join(vs, ", ")+" -> <"+*n.d+">")
	}

	if n.v != nil {
		keys := make([]string, 0, len(n.v))
		for k := range n.v {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for _, val := range keys {
			vsc := make([]string, len(vs))
			copy(vsc, vs)
			vsc = append(vsc, n.k+"="+val)
			p.walk(n.v[val], vsc, str)
		}
	}

	if n.g != nil {
		gkeys := make([]string, 0, len(n.g))
		for k := range n.g {
			gkeys = append(gkeys, k)
		}
		sort.Strings(gkeys)

		for _, gk := range gkeys {
			for _, mv := range n.g[gk] {
				vsc := make([]string, len(vs))
				copy(vsc, vs)
				vsc = append(vsc, n.k+"~"+mv.Fix())
				if mv.Keymap() != nil {
					p.walk(mv.Keymap(), vsc, str)
				}
			}
		}
	}

	if n.s != nil {
		vsc := make([]string, len(vs))
		copy(vsc, vs)
		p.walk(n.s, vsc, str)
	}
}

// ToJSON returns a JSON representation of the internal trie.
func (p *Patrun) ToJSON() string {
	b, _ := json.Marshal(p.top)
	return string(b)
}

// GexMatcher handles glob-expression patterns using the gex library.
type GexMatcher struct{}

type gexMatchValue struct {
	fix    string
	g      *gex.Gexer
	keymap *keymap
}

func (m *GexMatcher) Make(key, fix string) (MatchValue, bool) {
	if strings.ContainsAny(fix, "*?") {
		g := gex.New(fix)
		return &gexMatchValue{fix: fix, g: g}, true
	}
	return nil, false
}

func (v *gexMatchValue) Match(val string) bool {
	return v.g.Match(val)
}

func (v *gexMatchValue) Same(other MatchValue) bool {
	if other == nil {
		return false
	}
	return other.Kind() == "gex" && other.Fix() == v.fix
}

func (v *gexMatchValue) Kind() string       { return "gex" }
func (v *gexMatchValue) Fix() string        { return v.fix }
func (v *gexMatchValue) Keymap() *keymap     { return v.keymap }
func (v *gexMatchValue) SetKeymap(km *keymap) { v.keymap = km }
