# patrun (Go)

A fast pattern matcher on `map[string]string` properties.

**Version:** `0.1.0` (exported as the `patrun.Version` constant in `patrun.go`).

This is the Go port of the [JavaScript / TypeScript `patrun`
package](../README.md). The behavior matches the JS version except for
points called out in the
[Explanation](#explanation-design-notes-and-go-specific-caveats)
section.

---

## Tutorial: your first patrun

Install:

```sh
go get github.com/rjrodger/patrun
```

Register a few patterns and look one up:

```go
package main

import (
    "fmt"

    "github.com/rjrodger/patrun"
)

func s(v string) *string { return &v }

func main() {
    pm := patrun.New()
    pm.Add(map[string]string{"a": "1"},               s("A"))
    pm.Add(map[string]string{"a": "1", "b": "1"},     s("B"))
    pm.Add(map[string]string{"a": "1", "b": "2"},     s("C"))

    if d, ok := pm.Find(map[string]string{"a": "1"}); ok {
        fmt.Println(*d) // "A"
    }

    // unknown keys in the query are ignored
    if d, ok := pm.Find(map[string]string{"a": "1", "z": "9"}); ok {
        fmt.Println(*d) // "A"
    }

    // more specific patterns win
    if d, ok := pm.Find(map[string]string{"a": "1", "b": "2"}); ok {
        fmt.Println(*d) // "C"
    }

    // no match
    if _, ok := pm.Find(map[string]string{"a": "2"}); !ok {
        fmt.Println("no match")
    }
}
```

The matcher stores patterns in a trie keyed by sorted property names,
so `Find` makes the minimum number of comparisons needed to pick out
the most specific match.

Data is held as `*string`. Use `nil` for "registered but no payload";
the helper `s := func(v string) *string { return &v }` is just a
convenience.

---

## How-to guides

### Pick the most specific match

This is the default behavior of `Find`:

```go
pm := patrun.New()
pm.Add(map[string]string{"a": "1"},                       s("A"))
pm.Add(map[string]string{"a": "1", "b": "1"},             s("AB"))

pm.Find(map[string]string{"a": "1", "b": "1"}) // -> "AB"
pm.Find(map[string]string{"a": "1", "b": "9"}) // -> "A"  (falls back)
pm.Find(map[string]string{"a": "1"})           // -> "A"
```

Property names are checked in alphabetical order, so `{a, b}` and
`{b, a}` produce the same trie.

### Require all keys to match

`FindExact` only returns data when every key in the pattern is present
in the query (and matches):

```go
pm.FindExact(map[string]string{"a": "1"})           // -> "A"
pm.FindExact(map[string]string{"a": "1", "b": "9"}) // -> not found
```

### Collect every match along the path

`Collect` returns the data for every pattern matched on the way down,
from widest to narrowest:

```go
pm := patrun.New()
pm.Add(map[string]string{},                              s("ROOT"))
pm.Add(map[string]string{"a": "1"},                      s("A"))
pm.Add(map[string]string{"a": "1", "b": "1"},            s("AB"))

pm.Collect(map[string]string{"a": "1", "b": "1"})
// -> ["ROOT", "A", "AB"]
```

### Match values with glob expressions

Enable the `gex` matcher to use `*` and `?` wildcards in pattern
values:

```go
pm := patrun.New(patrun.Options{Gex: true})
pm.Add(map[string]string{"a": "0"},                  s("A"))
pm.Add(map[string]string{"a": "*"},                  s("AA"))
pm.Add(map[string]string{"b": "1", "c": "x*y"},      s("BC"))

pm.Find(map[string]string{"a": "0"})                 // -> "A"   exact
pm.Find(map[string]string{"a": "1"})                 // -> "AA"  glob
pm.Find(map[string]string{"b": "1", "c": "xhy"})     // -> "BC"  exact + glob
```

Exact matches beat glob matches; otherwise the most-specific rule
applies as usual.

### Match numeric intervals

Enable the `Interval` matcher for numeric-range pattern values:

```go
pm := patrun.New(patrun.Options{Interval: true})
pm.Add(map[string]string{"x": "<10"},     s("low"))
pm.Add(map[string]string{"x": "[10,20]"}, s("mid"))
pm.Add(map[string]string{"x": ">20"},     s("high"))

pm.Find(map[string]string{"x": "5"})  // -> "low"
pm.Find(map[string]string{"x": "15"}) // -> "mid"
pm.Find(map[string]string{"x": "42"}) // -> "high"
```

Supported forms include `>n`, `>=n`, `<n`, `<=n`, `=n`, ranges with
brackets `[a,b]` / `(a,b)`, joined comparisons `>=10&<20`, alternations
`<10||>20`, and the dotted form `10..20`.

### Both at once

`Gex` and `Interval` can be enabled together:

```go
pm := patrun.New(patrun.Options{Gex: true, Interval: true})
```

### List every registered pattern

Pass an empty map (or `nil`) to `List` to dump all stored patterns:

```go
for _, e := range pm.List(nil) {
    fmt.Printf("%v -> %s\n", e.Match, e.Data)
}
```

Pass a partial pattern to filter the list:

```go
pm := patrun.New()
pm.Add(map[string]string{"a": "1", "b": "1"}, s("B1"))
pm.Add(map[string]string{"a": "1", "b": "2"}, s("B2"))

pm.List(map[string]string{"a": "1"})
// -> [{a:1 b:1 -> B1}, {a:1 b:2 -> B2}]
```

Omitted keys are *not* equivalent to a wildcard — you must specify
each key you want to filter on.

### Remove a pattern

```go
pm.Remove(map[string]string{"a": "1", "b": "1"})
```

The slot is cleared in place; sibling patterns under the same trie
prefix are unaffected.

### Inspect the decision tree

`String()` (also satisfies `fmt.Stringer`) renders the tree as a flat
list of patterns and their data:

```go
fmt.Println(pm.String())
// a=1 -> <A>
// a=1, b=1 -> <AB>
```

`ToJSON()` returns the raw internal trie as JSON, useful for
debugging.

---

## Reference

### `func New(opts ...Options) *Patrun`

Construct a new matcher. Pass at most one `Options` (the variadic form
keeps the no-arg call ergonomic).

### `Options`

```go
type Options struct {
    Gex      bool // enable * / ? glob matching on values
    Interval bool // enable numeric interval matching on values
}
```

### Methods on `*Patrun`

| Method                                                | Description                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `Add(pat map[string]string, data *string) *Patrun`    | Register a pattern. Returns the receiver for chaining.                   |
| `Find(pat map[string]string) (*string, bool)`         | Most-specific match; falls back to wider matches. Unknown keys ignored.  |
| `FindExact(pat map[string]string) (*string, bool)`    | Exact match — every pattern key must be present in the query.            |
| `Collect(pat map[string]string) []string`             | All data values matched along the trie path, widest first.               |
| `List(pat map[string]string) []ListEntry`             | All registered patterns, optionally filtered by a partial pattern.       |
| `Remove(pat map[string]string)`                       | Clear the data stored at the given pattern.                              |
| `String() string`                                     | Human-readable rendering of all registered patterns.                     |
| `ToJSON() string`                                     | JSON of the internal trie (debugging).                                   |
| `Top() *keymap`                                       | Internal trie root (debugging).                                          |

### `ListEntry`

```go
type ListEntry struct {
    Match map[string]string
    Data  string
}
```

### Matcher extension points

`Patrun` consults a slice of `Matcher`s to recognise non-literal
pattern values. Built-ins are `GexMatcher` (enabled by `Options.Gex`)
and `IntervalMatcher` (enabled by `Options.Interval`).

```go
type Matcher interface {
    Make(key, fix string) (MatchValue, bool)
}

type MatchValue interface {
    Match(val string) bool
    Same(other MatchValue) bool
    Kind() string
    Fix() string
    Keymap() *keymap
    SetKeymap(km *keymap)
}
```

### Constants

```go
const Version = "0.1.0"
```

---

## Explanation: design notes and Go-specific caveats

`patrun` is a decision-tree builder for code that would otherwise grow
a long `if`/`else` chain over property values — sales-tax rules,
plugin dispatch, request routing. The two rules that drive every
behavior are:

1. More specific matches win. "More specific" means more matched
   key/value pairs, not pattern insertion order.
2. Property names are compared in alphabetical order, so the trie
   layout is independent of how callers build the pattern map.

**Why `map[string]string` instead of `map[string]any`?** The original
JS API coerces all keys and values to strings before storing them, so
the Go port commits to that contract at the type level. Numeric and
boolean keys are the caller's responsibility to format consistently
(e.g. `strconv.Itoa`, `strconv.FormatFloat`). The interval matcher
parses values back to `float64` at match time when enabled.

**Why `*string` for data?** Go has no `undefined`, so the port uses a
nil pointer to mean "no data here." This keeps the trie-walk logic
identical to the JS implementation, which distinguishes "registered
but no value" from "not registered." If you only ever store
non-empty payloads, a tiny helper (`func s(v string) *string { return
&v }`) is enough to hide it at call sites.

**Differences from the JS version.**

- The JS `add(pat, data)` accepts arbitrary `data` (objects,
  functions, anything). The Go version stores a `*string`. To attach
  rich data, store a key into your own table.
- The JS version supports a `custom` callback passed to
  `patrun(custom)` that can rewrite patterns at insert time and wrap
  finds/removes. The Go port does not yet expose this; the matcher
  interface (`Matcher` / `MatchValue`) covers the most common use
  case (gex, intervals).
- The JS version exposes `inspect` as an alias for `toString`. Go
  uses `String()` (the `fmt.Stringer` convention) and `ToJSON()`.

**Why a trie at all?** A linear scan of N patterns is O(N) per
lookup; the trie is O(K) in the number of *distinct* keys present in
the most specific matched pattern. For workloads with many patterns
sharing a common prefix (Seneca's plugin actions are the canonical
example) this is a significant win.

**Star paths.** When a pattern omits a key that a sibling pattern
includes, `add` builds an `s` ("star") branch that the lookup falls
back to. This is what lets `{a:1}` still match `{a:1, b:9}` even
though `b` was registered elsewhere — without it, more-specific
matches would shadow wider matches incorrectly.

---

## License

Copyright (c) 2013-2025, Richard Rodger and other contributors.
Licensed under [MIT](../LICENSE).
