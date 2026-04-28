# patrun

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/13789/branches/241950/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=13789&bid=241950)
[![Maintainability](https://api.codeclimate.com/v1/badges/9d08de0c9c30f0197bcd/maintainability)](https://codeclimate.com/github/rjrodger/patrun/maintainability)

A fast pattern matcher on JavaScript object properties. Builds a
decision tree so you can pick out the most-specific match for a given
subject without writing chains of `if` statements. Used by the
[Seneca](http://senecajs.org) framework to dispatch actions.

A Go port is also available — see [`go/README.md`](./go/README.md).

From the Irish *patrún*: [pattern](http://www.focloir.ie/en/dictionary/ei/pattern). Pronounced *pah-troon*.

---

## Tutorial: your first patrun

Install:

```sh
npm install patrun
```

Register a few patterns, then look one up:

```js
const patrun = require('patrun')

const pm = patrun()
  .add({ a: 1 },         'A')
  .add({ a: 1, b: 1 },   'B')
  .add({ a: 1, b: 2 },   'C')

pm.find({ a: 1 })           // → 'A'
pm.find({ a: 2 })           // → null  (no match)
pm.find({ a: 1, b: 1 })     // → 'B'   (more specific wins)
pm.find({ a: 1, b: 2 })     // → 'C'
pm.find({ a: 1, z: 9 })     // → 'A'   (unknown keys ignored)
```

The matcher stores patterns in a trie keyed by sorted property names,
so `find` makes the minimum number of comparisons needed to pick out
the most specific match. It's _query-by-example_ for property sets.

You're matching a subset, so your input can contain any number of
extra properties — they're ignored.

---

## How-to guides

### Pick the most specific match (the default)

The two rules that govern every match:

1. More specific matches beat less specific ones — more matched
   key/value pairs always win.
2. Property names are checked in alphabetical order, so insertion
   order doesn't matter.

```js
const pm = patrun()
  .add({ a: 0 },          'A')
  .add({ b: 1 },          'B')
  .add({ c: 2 },          'C')
  .add({ a: 0, b: 1 },    'AB')

pm.find({ a: 0 })            // → 'A'
pm.find({ a: 0, b: 1 })      // → 'AB'  (more specific than {a:0})
pm.find({ a: 0, c: 2 })      // → 'A'   (a comes before c)
pm.find({ b: 1, c: 2 })      // → 'B'   (b comes before c)
```

### Require all keys to match

Pass `true` as the second argument to `find` for exact matching —
every key in the registered pattern must be present in the subject:

```js
pm.find({ a: 0, b: 1 }, true)  // → 'AB'
pm.find({ a: 0, b: 9 }, true)  // → null  (b doesn't match)
```

### Collect every match along the path

Pass `true` as the third argument to `find` to get *all* data
matched on the way down, widest first:

```js
const pm = patrun()
  .add({},                 'ROOT')
  .add({ a: 1 },           'A')
  .add({ a: 1, b: 1 },     'AB')

pm.find({ a: 1, b: 1 }, false, true)
// → ['ROOT', 'A', 'AB']
```

### Match values with glob expressions

Enable the `gex` matcher to use `*` and `?` wildcards in pattern
values (powered by [gex](https://github.com/rjrodger/gex)):

```js
const pm = patrun({ gex: true })
  .add({ a: 0 },              'A')
  .add({ a: '*' },            'AA')
  .add({ b: 1, c: 'x*y' },    'BC')

pm.find({ a: 0 })             // → 'A'   exact
pm.find({ a: 1 })             // → 'AA'  glob
pm.find({ b: 1, c: 'xhy' })   // → 'BC'  exact + glob
```

Exact matches beat glob matches; otherwise the more-specific rule
applies as usual. See the
[multi-gex test](https://github.com/rjrodger/patrun/blob/master/test/patrun.test.js)
for funky examples.

### Build a decision tree of business rules

A larger example — sales-tax rules with country, state, city, and
type overrides:

```js
function I(val) { const rate = () => val; rate.val = val; return rate }

const salestax = patrun()
  .add({},                                           I(0.0))

  .add({ country: 'IE' },                            I(0.25))
  .add({ country: 'UK' },                            I(0.20))
  .add({ country: 'DE' },                            I(0.19))

  .add({ country: 'IE', type: 'reduced' },           I(0.135))
  .add({ country: 'IE', type: 'food' },              I(0.048))
  .add({ country: 'UK', type: 'food' },              I(0.0))
  .add({ country: 'DE', type: 'reduced' },           I(0.07))

  .add({ country: 'US' },                            I(0.0))
  .add({ country: 'US', state: 'AL' },               I(0.04))
  .add({ country: 'US', state: 'AL', city: 'Montgomery' }, I(0.10))
  .add({ country: 'US', state: 'NY' },               I(0.07))
  .add({ country: 'US', state: 'NY', type: 'reduced' }, function under110(net) {
    return net < 110 ? 0.0 : salestax.find({ country: 'US', state: 'NY' })
  })

salestax.find({ country: 'IE', type: 'food' })(99)            // 0.048
salestax.find({ country: 'US', state: 'AL', city: 'Montgomery' })(99) // 0.1
```

### List every registered pattern

Pass no argument (or an empty object) to `list` to dump everything:

```js
pm.list()
```

Pass a partial pattern to filter:

```js
const pm = patrun()
  .add({ a: 1, b: 1 }, 'B1')
  .add({ a: 1, b: 2 }, 'B2')

pm.list({ a: 1 })
// [ { match: { a: '1', b: '1' }, data: 'B1' },
//   { match: { a: '1', b: '2' }, data: 'B2' } ]

pm.list({ a: 1, b: '*' })   // wildcards allowed
pm.list({ a: 1, c: 1 })     // []  (no matches)
```

Omitted keys are *not* equivalent to `'*'` — you must specify each
key you want to filter on.

### Remove a pattern

```js
pm.remove({ a: 1, b: 1 })
```

### Customise stored data

Pass a function as the constructor argument to wrap stored data. It
runs at `add` time and may return a transform applied at `find` time
(plus an optional remove handler).

Add a constant property to every stored pattern:

```js
const alwaysAddFoo = patrun(function (pat) {
  pat.foo = true
})

alwaysAddFoo.add({ a: 1 }, 'bar')
alwaysAddFoo.find({ a: 1 })             // null
alwaysAddFoo.find({ a: 1, foo: true })  // 'bar'
```

Transform found data:

```js
const upperify = patrun(function (pat) {
  return function (args, data) {
    return ('' + data).toUpperCase()
  }
})

upperify.add({ a: 1 }, 'bar')
upperify.find({ a: 1 })  // 'BAR'
```

Allow multiple matches per pattern:

```js
const many = patrun(function (pat, data) {
  const items = this.find(pat, true) || []
  items.push(data)

  return {
    find:   (args, data) => items.length ? items : null,
    remove: (args, data) => { items.pop(); return items.length === 0 }
  }
})

many.add({ a: 1 }, 'A')
many.add({ a: 1 }, 'B')
many.find({ a: 1 })   // ['A', 'B']
many.remove({ a: 1 })
many.find({ a: 1 })   // ['A']
```

### Inspect the decision tree

`toString` renders the tree as a flat list of patterns and their
data, optionally with a custom formatter:

```js
console.log(salestax.toString(f => f.name + ':' + f.val))
//  -> :0
// city=Montgomery, country=US, state=AL -> :0.1
// country=IE -> :0.25
// country=IE, type=food -> :0.048
// ...
```

`toJSON(indent)` returns the raw internal trie as JSON, useful for
debugging.

---

## Reference

### `patrun(custom?)`

Create a new pattern matcher. `custom` may be:

- omitted — plain matcher.
- `{ gex: true }` — enable `*` / `?` glob matching on values.
- a function — runs at every `add` to rewrite the pattern and
  optionally return a `find` transform / `remove` handler. See
  [Customise stored data](#customise-stored-data).

### `.add(pattern, data)`

Register `pattern` (object of strings — other types are coerced) and
its associated `data`. Returns the matcher for chaining.

### `.find(subject, exact?, collect?)`

Look up the most-specific match for `subject`. Unknown keys in
`subject` are ignored.

- `exact` *(boolean, default `false`)* — require all pattern keys to
  be present and equal in `subject`.
- `collect` *(boolean, default `false`)* — return an array of every
  data value matched along the way (widest first) instead of a single
  value. With `collect=true` and `exact=false`, every sub-pattern of
  `subject` is searched. With `exact=true`, only sub-patterns in
  lexicographic order are considered.

Returns the data, or `null` if no pattern matched.

### `.findexact(subject)`

Shorthand for `.find(subject, true)`.

### `.list(partial?, exact?)`

Return all registered patterns matching `partial` (a partial pattern;
values may be globs). Omitted keys are *not* wildcards. With no
argument, lists every registered pattern. Returns an array of
`{ match, data, find }`.

### `.remove(pattern)`

Clear the data stored at `pattern`.

### `.toString(formatter?, tree?)`

Render the decision tree.

- `formatter(data)` — optional custom formatter for stored values.
- `tree` *(boolean, default `false`)* — if `true`, print as an
  indented tree instead of a flat list.

`patrun.inspect` is an alias for `toString`.

### `.toJSON(indent?)`

Return the internal trie as JSON.

---

## Explanation: design notes

### The two rules

`patrun` is built around two rules and nothing else:

1. **More specific matches win.** "More specific" means more matched
   key/value pairs, not insertion order.
2. **Property names are compared in alphabetical order.**

Rule 2 is what makes the trie layout independent of how callers build
their patterns. `add({a:1, b:2})` and `add({b:2, a:1})` produce the
exact same internal structure.

### Why a trie?

A linear scan of N patterns is O(N) per lookup. The trie is O(K) in
the number of *distinct* keys present in the most specific matched
pattern. For workloads with many patterns sharing a common prefix —
Seneca's plugin actions are the canonical example — this is a
significant win.

### Star paths

When a pattern omits a key that a sibling pattern includes, `add`
builds a `s` ("star") branch that the lookup falls back to. This is
what lets `{a:1}` still match `{a:1, b:9}` even though `b` is
registered elsewhere — without it, more-specific matches would
shadow wider matches incorrectly.

### Strings everywhere

Keys and values are coerced to strings before storage. This keeps the
matching logic simple and avoids surprises around `==` vs `===` /
type coercion. If you need numeric-range matching, the Go port
includes an `Interval` matcher (the JS port currently only ships
gex).

### Why not "just write `if` statements"?

A handful of cases is fine as `if` statements. But once your dispatch
table has sub-cases and sub-sub-cases, the `if` ladder stops being
readable and stops being maintainable — adding a new branch becomes a
merge-conflict generator. `patrun` lets each branch be added (and
removed, listed, inspected) independently.

---

## License

Copyright (c) 2013-2025, Richard Rodger and other contributors.
Licensed under [MIT](./LICENSE).


[npm-badge]: https://badge.fury.io/js/patrun.svg
[npm-url]: https://badge.fury.io/js/patrun
[travis-badge]: https://api.travis-ci.org/rjrodger/patrun.svg
[travis-url]: https://travis-ci.org/rjrodger/patrun
[coveralls-badge]: https://coveralls.io/repos/rjrodger/patrun/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/rjrodger/patrun?branch=master
[david-badge]: https://david-dm.org/rjrodger/patrun.svg
[david-url]: https://david-dm.org/rjrodger/patrun
