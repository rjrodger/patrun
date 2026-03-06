package patrun

import (
	"math"
	"regexp"
	"strconv"
	"strings"
)

// intervalRE parses interval expressions like ">10", ">=10&<20", "[10,20]", "<10||>20"
var intervalRE = regexp.MustCompile(
	`^\s*` +
		`(=*[<>(\[]?=*)?` + // 1: operator
		`\s*` +
		`([-+0-9a-fA-FeEoOxX]+(?:\.([0-9a-fA-FeEoOxX]+))?)` + // 2,3: number
		`([)\]]?)` + // 4: optional close bracket
		`(` + // 5: start optional second term
		`\s*(,|&+|\|+|\.\.)` + // 6: join
		`\s*` +
		`(=*[<>]?=*)` + // 7: operator
		`\s*` +
		`([-+.0-9a-fA-FeEoOxX]+)` + // 8: number
		`\s*` +
		`([)\]]?)` + // 9: close bracket
		`)?` + // end optional second term
		`\s*$`,
)

type opFunc func(float64) bool

func opGT(n float64) opFunc  { return func(x float64) bool { return x > n } }
func opGTE(n float64) opFunc { return func(x float64) bool { return x >= n } }
func opLT(n float64) opFunc  { return func(x float64) bool { return x < n } }
func opLTE(n float64) opFunc { return func(x float64) bool { return x <= n } }
func opEQ(n float64) opFunc  { return func(x float64) bool { return x == n } }
func opNIL(_ float64) opFunc { return func(_ float64) bool { return false } }
func opERR(_ float64) opFunc { return func(_ float64) bool { return false } }

type joFunc func(opFunc, opFunc) func(float64) bool

func joAND(lhs, rhs opFunc) func(float64) bool {
	return func(x float64) bool { return lhs(x) && rhs(x) }
}
func joOR(lhs, rhs opFunc) func(float64) bool {
	return func(x float64) bool { return lhs(x) || rhs(x) }
}

// normop normalises operator strings: "=<" -> "<=", "(" -> ">", "[" -> ">=", etc.
func normop(op string) string {
	if op == "" {
		return ""
	}
	// Extract bracket or comparison operator
	bracket := ""
	hasEq := strings.Contains(op, "=")

	for _, c := range op {
		switch c {
		case '<', '>', '(', ')', '[', ']':
			bracket = string(c)
		}
	}

	result := bracket
	if hasEq {
		result += "="
	}
	return result
}

func resolveOp(os string) (func(float64) opFunc, bool) {
	switch os {
	case "=":
		return opEQ, false
	case "<", ")":
		return opLT, false
	case "<=", "]", "]=":
		return opLTE, false
	case ">", "(":
		return opGT, false
	case ">=", "[", "[=":
		return opGTE, false
	default:
		return nil, true
	}
}

// IntervalMatcher handles numeric interval/range patterns.
type IntervalMatcher struct{}

type intervalMatchValue struct {
	fix    string
	check  func(float64) bool
	meta   intervalMeta
	keymap *keymap
}

type intervalMeta struct {
	jo     string
	o0, o1 string
	n0, n1 float64
}

func (m *IntervalMatcher) Make(key, fix string) (MatchValue, bool) {
	if !strings.ContainsAny(fix, "=<>.[()\\]") {
		return nil, false
	}

	match := intervalRE.FindStringSubmatch(fix)
	if match == nil {
		return nil, false
	}

	os0 := normop(match[1])
	if os0 == "" {
		os0 = normop(match[4])
	}
	os1 := normop(match[7])
	if os1 == "" {
		os1 = normop(match[9])
	}

	n0, err0 := strconv.ParseFloat(match[2], 64)
	if err0 != nil {
		return nil, false
	}

	n1 := math.NaN()
	if match[8] != "" {
		var err1 error
		n1, err1 = strconv.ParseFloat(match[8], 64)
		if err1 != nil {
			return nil, false
		}
	}

	jos := match[6]

	// Determine join operator
	var jo joFunc = joOR
	if jos != "" {
		first := jos[0]
		if first == '&' || first == ',' {
			jo = joAND
		}
	}

	// Determine o0
	o0maker, isErr := resolveOp(os0)
	if isErr || o0maker == nil {
		// If no recognised operator found, treat as error
		o0maker = func(n float64) opFunc { return opERR(n) }
	}

	// Handle ".." join
	if jos == ".." {
		jo = joAND
		if o0maker == nil || isErr {
			o0maker = func(n float64) opFunc { return opGTE(n) }
		}
		if os1 == "" {
			os1 = "<="
		}
	}

	// Determine o1
	var o1maker func(float64) opFunc
	if os1 == "" && match[8] == "" {
		o1maker = func(n float64) opFunc { return opNIL(n) }
	} else {
		o1m, o1err := resolveOp(os1)
		if o1err || o1m == nil {
			o1maker = func(n float64) opFunc { return opERR(n) }
		} else {
			o1maker = o1m
		}
	}

	// Merge ops if same number
	if !math.IsNaN(n1) && n0 == n1 {
		if os0 == "=" && os1 != "" {
			n1 = math.NaN()
			o1maker = func(n float64) opFunc { return opNIL(n) }
			if strings.Contains(os1, "<") {
				o0maker = func(n float64) opFunc { return opLTE(n) }
			} else if strings.Contains(os1, ">") {
				o0maker = func(n float64) opFunc { return opGTE(n) }
			} else if strings.Contains(os1, "=") {
				o0maker = func(n float64) opFunc { return opEQ(n) }
			} else {
				o0maker = func(n float64) opFunc { return opERR(n) }
			}
		} else if os1 == "=" && os0 != "" {
			n1 = math.NaN()
			o1maker = func(n float64) opFunc { return opNIL(n) }
			if strings.Contains(os0, "<") {
				o0maker = func(n float64) opFunc { return opLTE(n) }
			} else if strings.Contains(os0, ">") {
				o0maker = func(n float64) opFunc { return opGTE(n) }
			} else {
				o0maker = func(n float64) opFunc { return opERR(n) }
			}
		}
	}

	// One-sided interval: extend to infinity
	isO0Err := isErrOrNilFunc(o0maker)
	isO1Nil := isNilFunc(o1maker)

	if !isO0Err && isO1Nil {
		// Check direction of o0
		testO0 := o0maker(0)
		if isLTFunc(testO0, 0) {
			// o0 is < or <=, so range is [-inf, n0]
			o1maker = o0maker
			n1 = n0
			o0maker = func(n float64) opFunc { return opGTE(n) }
			n0 = math.Inf(-1)
			jo = joAND
		} else if isGTFunc(testO0, 0) {
			// o0 is > or >=, so range is [n0, +inf]
			o1maker = func(n float64) opFunc { return opLTE(n) }
			n1 = math.Inf(1)
			jo = joAND
		}
		// else: eq is fine as-is
	}

	// Lower bound always first
	if !math.IsNaN(n1) && n1 < n0 {
		if jos != ".." {
			o0maker, o1maker = o1maker, o0maker
		}
		n0, n1 = n1, n0
	}

	o0Final := o0maker(n0)
	o1Final := o1maker(n1)
	check := jo(o0Final, o1Final)

	meta := intervalMeta{
		n0: n0,
		n1: n1,
	}

	return &intervalMatchValue{
		fix:   fix,
		check: check,
		meta:  meta,
	}, true
}

// Helper functions to detect operator types
func isErrOrNilFunc(maker func(float64) opFunc) bool {
	f := maker(42)
	// ERR and NIL functions always return false
	return !f(42) && !f(0) && !f(-1) && !f(100)
}

func isNilFunc(maker func(float64) opFunc) bool {
	f := maker(42)
	return !f(42) && !f(0) && !f(-1) && !f(100)
}

func isLTFunc(f opFunc, n float64) bool {
	// < or <= : returns true for values below n
	return f(n - 1)
}

func isGTFunc(f opFunc, n float64) bool {
	// > or >= : returns true for values above n
	return f(n + 1)
}

func (v *intervalMatchValue) Match(val string) bool {
	n, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return false
	}
	return v.check(n)
}

func (v *intervalMatchValue) Same(other MatchValue) bool {
	if other == nil {
		return false
	}
	o, ok := other.(*intervalMatchValue)
	if !ok {
		return false
	}
	return v.meta.n0 == o.meta.n0 &&
		v.meta.n1 == o.meta.n1 &&
		v.meta.o0 == o.meta.o0 &&
		v.meta.o1 == o.meta.o1 &&
		v.meta.jo == o.meta.jo
}

func (v *intervalMatchValue) Kind() string        { return "interval" }
func (v *intervalMatchValue) Fix() string         { return v.fix }
func (v *intervalMatchValue) Keymap() *keymap      { return v.keymap }
func (v *intervalMatchValue) SetKeymap(km *keymap) { v.keymap = km }
