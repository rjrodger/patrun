// Package patrun provides a fast pattern matcher on map[string]string properties.
//
// Patterns are sets of key-value pairs. A pattern matches a query if all
// keys in the pattern are present in the query with the same values.
// When multiple patterns match, the most specific (most keys matched) wins.
// Patterns that match equally many keys are ranked by their keys in
// alphabetical order.
package patrun

import (
	"encoding/json"
	"sort"
	"strings"

	gex "github.com/rjrodger/gex/go"
)

const Version = "0.1.1"

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

	// The most pairs that any pattern can still match from this point of
	// the tree on. find uses this to leave branches that cannot do better
	// than the match it has.
	m int
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

		// This pattern has this many pairs still to match from here.
		reached := km.m
		if km.m < len(keys)-i {
			km.m = len(keys) - i
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

			// The keys moved along the star path keep their own reach.
			km.s = &keymap{
				k: km.k,
				v: km.v,
				m: reached,
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

// An alternative not yet tried: where to resume, and the depth of the path.
type pending struct {
	km    *keymap
	alt   int
	depth int
}

// find returns the data of the most specific pattern that matches the query:
// the one with the most key/value pairs. Patterns with equally many pairs
// are ranked by their keys in alphabetical order, then by an exact value
// over a matcher, then by the order in which the matchers were added.
//
// Each step down the tree matches one more pair, so the depth of a node is
// the number of pairs in its pattern. The search is depth first, in ranking
// order, and keeps the first of the deepest nodes that hold data. Every
// branch that the query matches is a candidate, not only the first.
func (p *Patrun) find(pat map[string]string, exact bool, collect bool) (*string, []string) {
	if pat == nil {
		return nil, nil
	}

	patlen := len(pat)
	var collection []string

	// The most specific match so far. A branch is followed only while it
	// could match more than beat pairs, going by the reach that Add noted
	// on its nodes: more than the best match so far has or, for an exact
	// find, all of the query's. Collect follows every branch.
	var best *keymap
	beat := -1
	if exact {
		beat = patlen - 1
	}

	var km *keymap
	alt := 0   // next alternative at km: 0 is the exact value, then matchers
	depth := 0 // pairs matched on the current path
	var todo []pending
	node := p.top // the node just reached; the root matches any query

	for {
		if node != nil {
			if node.d != nil {
				if collect {
					collection = append(collection, *node.d)
				} else if (exact && depth == patlen) || (!exact && beat < depth) {
					best = node
					beat = depth

					if exact {
						break
					}
				}
			}

			km = node
			alt = 0
			node = nil
		}

		// Follow the keys at this point, in order, to the next that matches,
		// unless nothing from here on could beat the best match.
		for km != nil && km.v != nil && depth+km.m > beat {
			key := km.k

			if val, has := pat[key]; has {
				var ga []MatchValue
				if km.g != nil {
					ga = km.g[key]
				}

				// Try the exact value first, then the gex/interval matchers.
				if alt == 0 {
					node = km.v[val]
					alt = 1
				}

				for node == nil && alt <= len(ga) {
					if ga[alt-1].Match(val) {
						node = ga[alt-1].Keymap()
					}
					alt++
				}

				if node != nil {
					// Still to try from here: the other matchers for this key,
					// and then the patterns that do not have this key (the
					// star trail).
					if alt <= len(ga) {
						todo = append(todo, pending{km, alt, depth})
					} else if km.s != nil && !exact {
						todo = append(todo, pending{km.s, 0, depth})
					}
					break
				}

				// The query has this key, but nothing here matches its value,
				// so an exact match is impossible. Otherwise follow the star
				// trail.
				if exact {
					break
				}
			}

			km = km.s
			alt = 0
		}

		if node != nil {
			depth++
			continue
		}

		// Dead end: go back to the latest untried alternative.
		if len(todo) == 0 {
			break
		}

		last := todo[len(todo)-1]
		todo = todo[:len(todo)-1]
		km, alt, depth = last.km, last.alt, last.depth
	}

	var data *string
	if best != nil {
		data = best.d
	}

	if collect {
		return nil, collection
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
