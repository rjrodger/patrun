package patrun

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
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
