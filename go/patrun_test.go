package patrun

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	gex "github.com/rjrodger/gex/go"
)

type tsvOp struct {
	op    string
	pat   map[string]string
	data  string
	extra string
	line  int
}

type tsvSection struct {
	opts Options
	ops  []tsvOp
}

func parseTSV(filepath string) ([]tsvOp, error) {
	f, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var ops []tsvOp
	scanner := bufio.NewScanner(f)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Split(line, "\t")
		op := parts[0]

		patStr := "{}"
		if len(parts) > 1 {
			patStr = parts[1]
		}

		data := ""
		if len(parts) > 2 {
			data = parts[2]
		}

		extra := ""
		if len(parts) > 3 {
			extra = parts[3]
		}

		var pat map[string]string
		if err := json.Unmarshal([]byte(patStr), &pat); err != nil {
			pat = map[string]string{}
		}

		ops = append(ops, tsvOp{
			op:    op,
			pat:   pat,
			data:  data,
			extra: extra,
			line:  lineNum,
		})
	}

	return ops, scanner.Err()
}

func groupSections(ops []tsvOp) []tsvSection {
	var sections []tsvSection
	current := tsvSection{}

	for _, op := range ops {
		if op.op == "clear" {
			if len(current.ops) > 0 {
				sections = append(sections, current)
			}
			var opts Options
			if op.extra != "" {
				var raw map[string]bool
				if err := json.Unmarshal([]byte(op.extra), &raw); err == nil {
					opts.Gex = raw["gex"]
					opts.Interval = raw["interval"]
				}
			}
			current = tsvSection{opts: opts}
		} else {
			current.ops = append(current.ops, op)
		}
	}

	if len(current.ops) > 0 {
		sections = append(sections, current)
	}

	return sections
}

func hasAssertions(ops []tsvOp) bool {
	for _, op := range ops {
		switch op.op {
		case "find", "findexact", "collect", "list":
			return true
		}
	}
	return false
}

func runTSVFile(t *testing.T, fpath string) {
	ops, err := parseTSV(fpath)
	if err != nil {
		t.Fatalf("Failed to parse %s: %v", fpath, err)
	}

	sections := groupSections(ops)

	for si, section := range sections {
		if !hasAssertions(section.ops) {
			continue
		}

		t.Run(fmt.Sprintf("section_%d", si+1), func(t *testing.T) {
			pr := New(section.opts)

			for _, op := range section.ops {
				switch op.op {
				case "add":
					var data *string
					if op.data == "null" {
						data = nil
					} else {
						d := op.data
						data = &d
					}
					pr.Add(op.pat, data)

				case "find":
					result, found := pr.Find(op.pat)
					if op.data == "null" {
						if found && result != nil {
							t.Errorf("L%d: find(%v) expected null, got %q",
								op.line, op.pat, *result)
						}
					} else {
						if !found || result == nil {
							t.Errorf("L%d: find(%v) expected %q, got null",
								op.line, op.pat, op.data)
						} else if *result != op.data {
							t.Errorf("L%d: find(%v) expected %q, got %q",
								op.line, op.pat, op.data, *result)
						}
					}

				case "findexact":
					result, found := pr.FindExact(op.pat)
					if op.data == "null" {
						if found && result != nil {
							t.Errorf("L%d: findexact(%v) expected null, got %q",
								op.line, op.pat, *result)
						}
					} else {
						if !found || result == nil {
							t.Errorf("L%d: findexact(%v) expected %q, got null",
								op.line, op.pat, op.data)
						} else if *result != op.data {
							t.Errorf("L%d: findexact(%v) expected %q, got %q",
								op.line, op.pat, op.data, *result)
						}
					}

				case "remove":
					pr.Remove(op.pat)

				case "collect":
					result := pr.Collect(op.pat)
					var expected []string
					if err := json.Unmarshal([]byte(op.data), &expected); err != nil {
						expected = []string{}
					}

					if len(result) == 0 && len(expected) == 0 {
						// Both empty, ok
					} else if len(result) != len(expected) {
						t.Errorf("L%d: collect(%v) expected %v, got %v",
							op.line, op.pat, expected, result)
					} else {
						for i := range expected {
							if result[i] != expected[i] {
								t.Errorf("L%d: collect(%v) expected %v, got %v",
									op.line, op.pat, expected, result)
								break
							}
						}
					}

				case "list":
					result := pr.List(op.pat)

					type listExpected struct {
						Match map[string]string `json:"match"`
						Data  string            `json:"data"`
					}
					var expected []listExpected
					if err := json.Unmarshal([]byte(op.data), &expected); err != nil {
						expected = []listExpected{}
					}

					if len(result) != len(expected) {
						t.Errorf("L%d: list(%v) expected %d entries, got %d\n  expected: %v\n  got: %v",
							op.line, op.pat, len(expected), len(result), expected, result)
					} else {
						for i := range expected {
							if result[i].Data != expected[i].Data {
								t.Errorf("L%d: list(%v)[%d].data expected %q, got %q",
									op.line, op.pat, i, expected[i].Data, result[i].Data)
							}
							// Compare match maps
							if !mapsEqual(result[i].Match, expected[i].Match) {
								t.Errorf("L%d: list(%v)[%d].match expected %v, got %v",
									op.line, op.pat, i, expected[i].Match, result[i].Match)
							}
						}
					}
				}
			}
		})
	}
}

func mapsEqual(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if bv, ok := b[k]; !ok || bv != v {
			return false
		}
	}
	return true
}

func TestTSV(t *testing.T) {
	dataDir := "../test/data"

	entries, err := os.ReadDir(dataDir)
	if err != nil {
		t.Fatalf("Failed to read data dir: %v", err)
	}

	// Sort for deterministic order
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".tsv") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, file := range files {
		t.Run(strings.TrimSuffix(file, ".tsv"), func(t *testing.T) {
			runTSVFile(t, filepath.Join(dataDir, file))
		})
	}
}

// refPattern is a pattern as the reference search of TestMostSpecificReference
// sees it.
type refPattern struct {
	name string
	pat  map[string]string
	keys []string
	rank map[string]int // order of each glob among those added at its point
}

func patternName(pat map[string]string) string {
	keys := make([]string, 0, len(pat))
	for k := range pat {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = k + "=" + pat[k]
	}
	return strings.Join(parts, ",")
}

// TestMostSpecificReference compares Find, FindExact and Collect with a
// search of every pattern, over many small random sets of patterns.
func TestMostSpecificReference(t *testing.T) {
	rnd := rand.New(rand.NewSource(20261127))
	names := []string{"a", "b", "c", "d", "e"}

	randomMap := func(max int, vals []string) map[string]string {
		m := map[string]string{}
		for n := rnd.Intn(max + 1); n > 0; n-- {
			m[names[rnd.Intn(len(names))]] = vals[rnd.Intn(len(vals))]
		}
		return m
	}

	for _, useGex := range []bool{false, true} {
		isGlob := func(fix string) bool {
			return useGex && strings.ContainsAny(fix, "*?")
		}
		matches := func(fix string, val string, has bool) bool {
			if !has {
				return false
			}
			if isGlob(fix) {
				return gex.New(fix).Match(val)
			}
			return fix == val
		}

		vals := []string{"1", "2"}
		if useGex {
			vals = []string{"1", "2", "*", "1*", "?"}
		}

		for round := 0; round < 1500; round++ {
			pr := New(Options{Gex: useGex})
			var pats []refPattern
			globs := map[string][]string{}

		adding:
			for n := 1 + rnd.Intn(6); n > 0; n-- {
				pat := randomMap(3, vals)
				name := patternName(pat)
				for _, rp := range pats {
					if rp.name == name {
						continue adding
					}
				}

				rp := refPattern{name: name, pat: pat, rank: map[string]int{}}
				for k := range pat {
					rp.keys = append(rp.keys, k)
				}
				sort.Strings(rp.keys)

				// Globs for a key rank in the order they were added at that point.
				path := ""
				for _, k := range rp.keys {
					if isGlob(pat[k]) {
						at := path + "|" + k
						rank := -1
						for i, fix := range globs[at] {
							if fix == pat[k] {
								rank = i
							}
						}
						if rank < 0 {
							rank = len(globs[at])
							globs[at] = append(globs[at], pat[k])
						}
						rp.rank[k] = rank
					}
					path += "," + k + "=" + pat[k]
				}

				data := name
				pr.Add(pat, &data)
				pats = append(pats, rp)
			}

			for q := 0; q < 6; q++ {
				query := randomMap(5, []string{"1", "2"})

				var found []refPattern
				for _, rp := range pats {
					ok := true
					for _, k := range rp.keys {
						val, has := query[k]
						ok = ok && matches(rp.pat[k], val, has)
					}
					if ok {
						found = append(found, rp)
					}
				}

				sort.SliceStable(found, func(i, j int) bool {
					x, y := found[i], found[j]
					if len(x.keys) != len(y.keys) {
						return len(x.keys) > len(y.keys)
					}
					for n, k := range x.keys {
						if k != y.keys[n] {
							return k < y.keys[n]
						}
						if x.pat[k] == y.pat[k] {
							continue
						}
						if isGlob(x.pat[k]) != isGlob(y.pat[k]) {
							return !isGlob(x.pat[k])
						}
						return x.rank[k] < y.rank[k]
					}
					return false
				})

				where := fmt.Sprintf("%v in %s", query, pr.String())

				want := "null"
				if len(found) > 0 {
					want = found[0].name
				}
				got := "null"
				if res, ok := pr.Find(query); ok {
					got = *res
				}
				if got != want {
					t.Fatalf("find: expected %q, got %q: %s", want, got, where)
				}

				want = "null"
				for _, rp := range found {
					if len(rp.keys) == len(query) {
						want = rp.name
						break
					}
				}
				got = "null"
				if res, ok := pr.FindExact(query); ok {
					got = *res
				}
				if got != want {
					t.Fatalf("findexact: expected %q, got %q: %s", want, got, where)
				}

				var all []string
				for _, rp := range found {
					all = append(all, rp.name)
				}
				sort.Strings(all)
				collected := append([]string{}, pr.Collect(query)...)
				sort.Strings(collected)
				if strings.Join(collected, ";") != strings.Join(all, ";") {
					t.Fatalf("collect: expected %v, got %v: %s", all, collected, where)
				}
			}
		}
	}
}
