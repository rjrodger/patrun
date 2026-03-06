/* Copyright (c) 2013-2020 Richard Rodger and other contributors, MIT License */
'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')

var Patrun = require('..')

function rs(x) {
  return x.toString(true).replace(/\s+/g, '').replace(/\n+/g, '')
}

describe('patrun', function () {
  it('toString', async () => {
    var r = Patrun()
    r.add({}, 'R')
    assert.equal(r.toString(true), ' <R>')
    assert.equal(r.toString(false), ' -> <R>')
    assert.equal(r.toString((d) => 'D:' + d), ' -> D:R')
    assert.equal(r.toString((d) => 'D:' + d, true), ' D:R')
    assert.equal(r.toString((d) => 'D:' + d, false), ' -> D:R')

    r.add({ a: 1 }, 'S')
    assert.equal(r.toString(true), ' <R>\na:\n 1 -> <S>')
    assert.equal(r.toString(false), ' -> <R>\na=1 -> <S>')
    assert.equal(r.toString((d) => 'D:' + d), ' -> D:R\na=1 -> D:S')
    assert.equal(r.toString((d) => 'D:' + d, true), ' D:R\na:\n 1 -> D:S')
    assert.equal(r.toString((d) => 'D:' + d, false), ' -> D:R\na=1 -> D:S')

    r.add({ a: 1, b: 2 }, function foo() {})
    assert.equal(
      r.toString(true),
      ' <R>\na:\n 1 -> <S>\n  b:\n   2 -> <foo>',
    )
    assert.equal(
      r.toString(false),
      ' -> <R>\na=1 -> <S>\na=1, b=2 -> <foo>',
    )
    assert.equal(
      r.toString((d) => 'D:' + d),
      ' -> D:R\na=1 -> D:S\na=1, b=2 -> D:function foo() {}',
    )
    assert.equal(
      r.toString((d) => 'D:' + d, true),
      ' D:R\na:\n 1 -> D:S\n  b:\n   2 -> D:function foo() {}',
    )
    assert.equal(
      r.toString((d) => 'D:' + d, false),
      ' -> D:R\na=1 -> D:S\na=1, b=2 -> D:function foo() {}',
    )
  })

  it('empty', async () => {
    var r = Patrun()
    assert.equal(r.toString(), '')

    assert.equal(r.find(NaN), null)
    assert.equal(r.find(void 0), null)
    assert.equal(r.find(null), null)
    assert.equal(r.find({}), null)
    assert.equal(r.find({ a: 1 }), null)

    r.add({ a: 1 }, 'A')

    assert.equal(r.find(NaN), null)
    assert.equal(r.find(void 0), null)
    assert.equal(r.find(null), null)
    assert.equal(r.find({}), null)
    assert.equal(r.find({ a: 1 }), 'A')
  })

  it('toString-matchers', async () => {
    var s = (r) => ('' + r).replace(/\n/g, ' ; ')
    var t = (r) => r.toString(true) + '\n'

    var r = Patrun({ gex: true })
    r.add({ a: 'a' }, 'Aa')
    r.add({ a: '*' }, 'A*')

    assert.equal(s(r), 'a=a -> <Aa> ; a~* -> <A*>')
    assert.equal(t(r), `
a:
 a -> <Aa>
 * ~> <A*>
`)

    r.add({ b: 'b' }, 'Bb')
    r.add({ b: '*' }, 'B*')

    assert.equal(s(r), 'a=a -> <Aa> ; a~* -> <A*> ; b=b -> <Bb> ; b~* -> <B*>')
    assert.equal(t(r), `
a:
 a -> <Aa>
 * ~> <A*>
 |
  b:
   b -> <Bb>
   * ~> <B*>
`)

    r.add({ a: 'a', b: 'b' }, 'AB')
    r.add({ a: '*', b: '*' }, 'AB*')
    assert.equal(
      s(r),
      'a=a -> <Aa> ; a=a, b=b -> <AB> ;' +
        ' a~* -> <A*> ; a~*, b~* -> <AB*> ; b=b -> <Bb> ; b~* -> <B*>',
    )
    assert.equal(t(r), `
a:
 a -> <Aa>
  b:
   b -> <AB>
 * ~> <A*>
  b:
   * ~> <AB*>
 |
  b:
   b -> <Bb>
   * ~> <B*>
`)
  })

  it('root-data', async () => {
    var r = Patrun()
    r.add({}, 'R')
    assert.equal('' + r, ' -> <R>')
    assert.equal(rs(r), '<R>')
    assert.equal(JSON.stringify(r.list()), '[{"match":{},"data":"R"}]')

    assert.equal(r.find({}), 'R')
    assert.equal(r.find({ x: 1 }), 'R')

    r.add({ a: '1' }, 'r1')
    assert.equal('' + r, ' -> <R>\na=1 -> <r1>')
    assert.equal(rs(r), '<R>a:1-><r1>')

    assert.equal(r.find({ x: 1 }), 'R')
    assert.equal(r.find({ a: 1 }), 'r1')
    assert.equal(r.find({ a: 2 }), 'R')

    r.add({ a: '1', b: '1' }, 'r2')
    assert.equal(r.find({ x: 1 }), 'R')
    assert.equal(r.find({ a: 1 }), 'r1')
    assert.equal(r.find({ a: 1, b: 1 }), 'r2')
    assert.equal(r.find({ a: 2 }), 'R')
    assert.equal(r.find({ a: 1, b: 2 }), 'r1') // a:1 is defined
    assert.equal(r.find({ a: 1, b: 2 }, true), null) // exact must be ... exact
    assert.equal(r.find({ a: 2, b: 2 }), 'R')
    assert.equal(r.find({ b: 2 }), 'R')

    r.add({ x: '1', y: '1' }, 'r3')
    assert.equal(r.find({ x: 1 }), 'R')

    assert.equal(r.find({ x: 1 }, true), null)

    assert.equal(
      JSON.stringify(r.list()),
      '[{"match":{},"data":"R"},{"match":{"a":"1"},"data":"r1"},{"match":{"a":"1","b":"1"},"data":"r2"},{"match":{"x":"1","y":"1"},"data":"r3"}]',
    )
  })

  it('add', async () => {
    var r

    r = Patrun()
    r.add({ a: '1' }, 'r1')
    assert.equal('' + r, 'a=1 -> <r1>')
    assert.equal(rs(r), 'a:1-><r1>')

    assert.equal(
      JSON.stringify(r.list()),
      '[{"match":{"a":"1"},"data":"r1"}]',
    )

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    assert.equal(rs(r), 'a:1->b:2-><r1>')

    r = Patrun()
    r.add({ a: '1', b: '2', c: '3' }, 'r1')
    assert.equal(rs(r), 'a:1->b:2->c:3-><r1>')

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    r.add({ a: '1', b: '3' }, 'r2')
    assert.equal('' + r, 'a=1, b=2 -> <r1>\na=1, b=3 -> <r2>')
    assert.equal(rs(r), 'a:1->b:2-><r1>3-><r2>')

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    r.add({ a: '1', c: '3' }, 'r2')
    assert.equal(rs(r), 'a:1->b:2-><r1>|c:3-><r2>')

    r.add({ a: '1', d: '4' }, 'r3')
    assert.equal(rs(r), 'a:1->b:2-><r1>|c:3-><r2>|d:4-><r3>')

    r = Patrun()
    r.add({ a: '1', c: '2' }, 'r1')
    r.add({ a: '1', b: '3' }, 'r2')
    assert.equal(rs(r), 'a:1->b:3-><r2>|c:2-><r1>')

    assert.equal(
      JSON.stringify(r.list()),
      '[{"match":{"a":"1","b":"3"},"data":"r2"},{"match":{"a":"1","c":"2"},"data":"r1"}]',
    )
  })

  it('basic', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 'v1' }, 'r1')
    assert.equal(rt1.find({ p1: 'v1' }), 'r1')
    assert.equal(rt1.find({ p2: 'v1' }), null)

    rt1.add({ p1: 'v1' }, 'r1x')
    assert.equal(rt1.find({ p1: 'v1' }), 'r1x')
    assert.equal(rt1.find({ p2: 'v1' }), null)

    rt1.add({ p1: 'v2' }, 'r2')
    assert.equal(rt1.find({ p1: 'v2' }), 'r2')
    assert.equal(rt1.find({ p2: 'v2' }), null)

    rt1.add({ p2: 'v3' }, 'r3')
    assert.equal(rt1.find({ p2: 'v3' }), 'r3')
    assert.equal(rt1.find({ p2: 'v2' }), null)
    assert.equal(rt1.find({ p2: 'v1' }), null)

    rt1.add({ p1: 'v1', p3: 'v4' }, 'r4')
    assert.equal(rt1.find({ p1: 'v1', p3: 'v4' }), 'r4')
    assert.equal(rt1.find({ p1: 'v1', p3: 'v5' }), 'r1x')
    assert.equal(rt1.find({ p2: 'v1' }), null)

    rt1.add({ p1: 'v1', p2: 'v5' }, 'r5')
    assert.equal(rt1.find({ p1: 'v1', p2: 'v5' }), 'r5')
  })

  it('culdesac', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 'v1' }, 'r1')
    rt1.add({ p1: 'v1', p2: 'v2' }, 'r2')
    rt1.add({ p1: 'v1', p3: 'v3' }, 'r3')

    assert.equal(rt1.find({ p1: 'v1', p2: 'x' }), 'r1')
    assert.equal(rt1.find({ p1: 'v1', p2: 'x', p3: 'v3' }), 'r3')
  })

  it('falsy-values', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 0 }, 'r1')
    rt1.add({ p1: 0, p2: '' }, 'r2')
    rt1.add({ p1: 0, p2: '', p3: false }, 'r3')

    assert.equal(rt1.find({ p1: null }), null)
    assert.equal(rt1.find({ p1: 0 }), 'r1')
    assert.equal(rt1.find({ p1: 0, p2: '' }), 'r2')
    assert.equal(rt1.find({ p1: 0, p2: '', p3: false }), 'r3')

    assert.deepStrictEqual(rt1.list().map((x) => x.data), ['r1', 'r2', 'r3'])
    assert.deepStrictEqual(rt1.list({}).map((x) => x.data), ['r1', 'r2', 'r3'])
    assert.deepStrictEqual(rt1.list({}, true).map((x) => x.data), [])

    assert.deepStrictEqual(rt1.list({ p1: 0 }).map((x) => x.data), ['r1', 'r2', 'r3'])
    assert.deepStrictEqual(rt1.list({ p2: '' }).map((x) => x.data), ['r2', 'r3'])
    assert.deepStrictEqual(rt1.list({ p3: false }).map((x) => x.data), ['r3'])

    assert.deepStrictEqual(rt1.list({ p1: 0 }, true).map((x) => x.data), ['r1'])
    assert.deepStrictEqual(rt1.list({ p1: 0, p2: '' }, true).map((x) => x.data), ['r2'])
    assert.deepStrictEqual(
      rt1.list({ p1: 0, p2: '', p3: false }, true).map((x) => x.data),
      ['r3'],
    )

    assert.deepStrictEqual(rt1.list({ p2: '' }, true).map((x) => x.data), [])
    assert.deepStrictEqual(rt1.list({ p2: '', p3: false }, true).map((x) => x.data), [])
    assert.deepStrictEqual(rt1.list({ p3: false }, true).map((x) => x.data), [])
  })

  it('find-exact-collect', async () => {
    var rt1 = Patrun()

    rt1.add({ x0: 'y0' }, 'e0') // deliberate noise
    rt1.add({ p1: 'v1' }, 'r1')
    rt1.add({ p1: 'v1', p2: 'v2' }, 'r2')
    rt1.add({ p1: 'v1', p3: 'v3' }, 'r3')

    rt1.add({ q1: 'w1' }, 's1')
    rt1.add({ q1: 'w1', q2: 'w2' }, 's2')
    rt1.add({ q1: 'w1', q3: 'w3' }, 's3')
    rt1.add({ q2: 'w2' }, 's4')

    assert.equal(rt1.find({ p1: 'v1' }, true), 'r1') // exact
    assert.equal(rt1.find({ p1: 'v1' }, false), 'r1') // not exact
    assert.equal(rt1.find({ p1: 'v1', p2: 'x' }, true), null) // exact
    assert.equal(rt1.find({ p1: 'v1', p2: 'x' }, false), 'r1') // not exact
    assert.equal(rt1.find({ p1: 'v1', p2: 'v2' }, false), 'r2') // not exact
    assert.equal(rt1.find({ p1: 'v1', p2: 'v2' }, true), 'r2') // exact

    assert.deepStrictEqual(rt1.find({ p1: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ p1: 'v1' }, false, true), ['r1'])
    assert.deepStrictEqual(rt1.find({ p1: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ p1: 'v1' }, true, true), ['r1'])

    // there only is a matching trail
    assert.deepStrictEqual(rt1.find({ p1: 'v1', p2: 'v2' }, false, true), ['r1', 'r2'])
    assert.deepStrictEqual(rt1.find({ p1: 'v1', p3: 'v3' }, false, true), ['r1', 'r3'])

    // just follows matching trail
    assert.deepStrictEqual(rt1.find({ p1: 'v1', p2: 'v2' }, true, true), ['r1', 'r2'])
    assert.deepStrictEqual(rt1.find({ p1: 'v1', p3: 'v3' }, true, true), ['r1', 'r3'])

    assert.deepStrictEqual(rt1.find({ q1: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, false, true), ['s1'])
    assert.deepStrictEqual(rt1.find({ q1: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, true, true), ['s1'])

    assert.deepStrictEqual(rt1.find({ q2: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ q2: 'w2' }, false, true), ['s4'])
    assert.deepStrictEqual(rt1.find({ q2: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ q2: 'w2' }, true, true), ['s4'])

    // followed a remainder path (q1 removed)
    assert.deepStrictEqual(
      rt1.find({ q1: 'w1', q2: 'w2' }, false, true).sort(),
      ['s4', 's1', 's2'].sort(),
    )
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q3: 'w3' }, false, true), ['s1', 's3'])

    // but exact does not follow remainders
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q2: 'w2' }, true, true), ['s1', 's2'])
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q3: 'w3' }, true, true), ['s1', 's3'])

    // add another remainder trail
    rt1.add({ q3: 'w3' }, 's5')

    // followed a remainder path (q1 removed)
    assert.deepStrictEqual(
      rt1.find({ q1: 'w1', q2: 'w2' }, false, true).sort(),
      ['s4', 's1', 's2'].sort(),
    )
    assert.deepStrictEqual(
      rt1.find({ q1: 'w1', q3: 'w3' }, false, true).sort(),
      ['s5', 's1', 's3'].sort(),
    )

    // but exact does not follow remainders
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q2: 'w2' }, true, true), ['s1', 's2'])
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q3: 'w3' }, true, true), ['s1', 's3'])

    assert.deepStrictEqual(rt1.find({ q1: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, false, true), ['s1'])
    assert.deepStrictEqual(rt1.find({ q1: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, true, true), ['s1'])

    assert.deepStrictEqual(rt1.find({ q2: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ q2: 'w2' }, false, true), ['s4'])
    assert.deepStrictEqual(rt1.find({ q2: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ q2: 'w2' }, true, true), ['s4'])

    assert.deepStrictEqual(rt1.find({ q3: 'x' }, false, true), [])
    assert.deepStrictEqual(rt1.find({ q3: 'w3' }, false, true), ['s5'])
    assert.deepStrictEqual(rt1.find({ q3: 'x' }, true, true), [])
    assert.deepStrictEqual(rt1.find({ q3: 'w3' }, true, true), ['s5'])

    // add a top
    rt1.add({}, 't')
    assert.deepStrictEqual(rt1.find({}, false, true), ['t'])

    assert.deepStrictEqual(rt1.find({ q1: 'x' }, false, true), ['t'])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, false, true), ['t', 's1'])
    assert.deepStrictEqual(rt1.find({ q1: 'x' }, true, true), ['t'])
    assert.deepStrictEqual(rt1.find({ q1: 'w1' }, true, true), ['t', 's1'])

    // followed a remainder path (q1 removed)
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q2: 'w2' }, false, true), [
      't',
      's1',
      's2',
      's4',
    ])
    assert.deepStrictEqual(rt1.find({ q1: 'w1', q3: 'w3' }, false, true), [
      't',
      's1',
      's3',
      's5',
    ])
  })

  it('remove', async () => {
    var rt1 = Patrun()
    rt1.remove({ p1: 'v1' })

    rt1.add({ p1: 'v1' }, 'r0')
    assert.equal(rt1.find({ p1: 'v1' }), 'r0')

    rt1.remove({ p1: 'v1' })
    assert.equal(rt1.find({ p1: 'v1' }), null)

    rt1.add({ p2: 'v2', p3: 'v3' }, 'r1')
    rt1.add({ p2: 'v2', p4: 'v4' }, 'r2')
    assert.equal(rt1.find({ p2: 'v2', p3: 'v3' }), 'r1')
    assert.equal(rt1.find({ p2: 'v2', p4: 'v4' }), 'r2')

    rt1.remove({ p2: 'v2', p3: 'v3' })
    assert.equal(rt1.find({ p2: 'v2', p3: 'v3' }), null)
    assert.equal(rt1.find({ p2: 'v2', p4: 'v4' }), 'r2')
  })

  function listtest(mode) {
    return async () => {
      var rt1 = Patrun()

      if ('subvals' === mode) {
        rt1.add({ a: '1' }, 'x')
      }

      rt1.add({ p1: 'v1' }, 'r0')

      rt1.add({ p1: 'v1', p2: 'v2a' }, 'r1')
      rt1.add({ p1: 'v1', p2: 'v2b' }, 'r2')

      var found = rt1.list({ p1: 'v1' })
      assert.deepStrictEqual(found, [
        { match: { p1: 'v1' }, data: 'r0', find: undefined },
        { match: { p1: 'v1', p2: 'v2a' }, data: 'r1', find: undefined },
        { match: { p1: 'v1', p2: 'v2b' }, data: 'r2', find: undefined },
      ])

      found = rt1.list({ p1: 'v1', p2: '*' })
      assert.deepStrictEqual(found, [
        { match: { p1: 'v1', p2: 'v2a' }, data: 'r1', find: undefined },
        { match: { p1: 'v1', p2: 'v2b' }, data: 'r2', find: undefined },
      ])

      rt1.add({ p1: 'v1', p2: 'v2c', p3: 'v3a' }, 'r3a')
      rt1.add({ p1: 'v1', p2: 'v2d', p3: 'v3b' }, 'r3b')
      found = rt1.list({ p1: 'v1', p2: '*', p3: 'v3a' })
      assert.deepStrictEqual(found, [
        {
          match: { p1: 'v1', p2: 'v2c', p3: 'v3a' },
          data: 'r3a',
          find: undefined,
        },
      ])

      // gex can accept a list of globs
      found = rt1.list({ p1: 'v1', p2: ['v2a', 'v2b', 'not-a-value'] })
      assert.deepStrictEqual(found, [
        { match: { p1: 'v1', p2: 'v2a' }, data: 'r1', find: undefined },
        { match: { p1: 'v1', p2: 'v2b' }, data: 'r2', find: undefined },
      ])
    }
  }

  it('list.topvals', listtest('topvals'))
  it('list.subvals', listtest('subvals'))

  it('null-undef-nan', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: null }, 'r1')
    assert.equal(rt1.toJSON(), '{"d":"r1"}')

    rt1.add({ p2: void 0 }, 'r2')
    assert.equal(rt1.toJSON(), '{"d":"r2"}')

    rt1.add({ p99: 'v99' }, 'r99')

    assert.equal(rt1.toJSON(), '{"d":"r2","k":"p99","v":{"v99":{"d":"r99"}}}')
  })

  it('multi-star', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'A')
    p.add({ a: 1, b: 2 }, 'B')
    p.add({ c: 3 }, 'C')
    p.add({ b: 1, c: 4 }, 'D')

    assert.equal(rs(p), 'a:1-><A>b:2-><B>|b:1->c:4-><D>|c:3-><C>')
    assert.equal(
      '' + p,
      'a=1 -> <A>\na=1, b=2 -> <B>\nb=1, c=4 -> <D>\nc=3 -> <C>',
    )

    assert.equal(p.find({ c: 3 }), 'C')
    assert.equal(p.find({ c: 3, a: 0 }), 'C')
    assert.equal(p.find({ c: 3, a: 0, b: 0 }), 'C')
  })

  it('star-backtrack', async () => {
    var p = Patrun()

    p.add({ a: 1, b: 2 }, 'X')
    p.add({ c: 3 }, 'Y')

    assert.equal(p.find({ a: 1, b: 2 }), 'X')
    assert.equal(p.find({ a: 1, b: 0, c: 3 }), 'Y')

    p.add({ a: 1, b: 2, d: 4 }, 'XX')
    p.add({ c: 3, d: 4 }, 'YY')

    assert.equal(p.find({ a: 1, b: 2, d: 4 }), 'XX')
    assert.equal(p.find({ a: 1, c: 3, d: 4 }), 'YY')
    assert.equal(p.find({ a: 1, b: 2 }), 'X')
    assert.equal(p.find({ a: 1, b: 0, c: 3 }), 'Y')

    assert.equal(p.list({ a: 1, b: '*' })[0].data, 'X')
    assert.equal(p.list({ c: 3 })[0].data, 'Y')
    assert.equal(p.list({ c: 3, d: '*' })[0].data, 'YY')
    assert.equal(p.list({ a: 1, b: '*', d: '*' })[0].data, 'XX')

    assert.equal(
      '' + p,
      'a=1, b=2 -> <X>\na=1, b=2, d=4 -> <XX>\nc=3 -> <Y>\nc=3, d=4 -> <YY>',
    )
  })

  it('remove-intermediate', async () => {
    var p = Patrun()

    p.add({ a: 1, b: 2, d: 4 }, 'XX')
    p.add({ c: 3, d: 4 }, 'YY')
    p.add({ a: 1, b: 2 }, 'X')
    p.add({ c: 3 }, 'Y')

    p.remove({ c: 3 })

    assert.equal(p.find({ c: 3 }), null)
    assert.equal(p.find({ a: 1, c: 3, d: 4 }), 'YY')
    assert.equal(p.find({ a: 1, b: 2, d: 4 }), 'XX')
    assert.equal(p.find({ a: 1, b: 2 }), 'X')

    p.remove({ a: 1, b: 2 })

    assert.equal(p.find({ c: 3 }), null)
    assert.equal(p.find({ a: 1, c: 3, d: 4 }), 'YY')
    assert.equal(p.find({ a: 1, b: 2, d: 4 }), 'XX')
    assert.equal(p.find({ a: 1, b: 2 }), null)
  })

  it('exact', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'X')

    assert.equal(p.findexact({ a: 1 }), 'X')
    assert.equal(p.findexact({ a: 1, b: 2 }), null)
  })

  it('all', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'X')
    p.add({ b: 2 }, 'Y')

    assert.equal(
      JSON.stringify(p.list()),
      '[{"match":{"a":"1"},"data":"X"},{"match":{"b":"2"},"data":"Y"}]',
    )
  })

  it('custom-happy', async () => {
    var p1 = Patrun(function (pat) {
      pat.q = 9
    })

    p1.add({ a: 1 }, 'Q')

    assert.equal(p1.find({ a: 1 }), null)
    assert.equal(p1.find({ a: 1, q: 9 }), 'Q')
  })

  it('custom-many', async () => {
    var p1 = Patrun(function (pat, data) {
      var items = this.find(pat, true) || []
      items.push(data)

      return {
        find: function (args, data) {
          return 0 < items.length ? items : null
        },
        remove: function (args, data) {
          items.pop()
          return 0 == items.length
        },
      }
    })

    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1 }, 'B')
    p1.add({ b: 1 }, 'C')

    assert.equal(p1.find({ a: 1 }).toString(), ['A', 'B'].toString())
    assert.equal(p1.find({ b: 1 }).toString(), ['C'].toString())
    assert.equal(p1.list().length, 2)

    p1.remove({ b: 1 })
    assert.equal(p1.list().length, 1)
    assert.equal(p1.find({ b: 1 }), null)
    assert.equal(p1.find({ a: 1 }).toString(), ['A', 'B'].toString())

    p1.remove({ a: 1 })
    assert.equal(p1.list().length, 1)
    assert.equal(p1.find({ b: 1 }), null)

    assert.equal(JSON.stringify(p1.find({ a: 1 })).toString(), '["A"]')

    p1.remove({ a: 1 })
    assert.equal(p1.list().length, 0)
    assert.equal(p1.find({ b: 1 }), null)
    assert.equal(p1.find({ a: 1 }), null)
  })

  it('custom-gex', async () => {
    // this custom function matches glob expressions
    var p2 = Patrun(function (pat, data) {
      var gexers = {}
      Object.keys(pat).forEach(function (k) {
        var v = pat[k]
        if ('string' === typeof v && ~v.indexOf('*')) {
          delete pat[k]
          gexers[k] = Patrun.Gex(v)
        }
      })

      // handle previous patterns that match this pattern
      var prev = this.list(pat)
      var prevfind = prev[0] && prev[0].find
      var prevdata = prev[0] && this.findexact(prev[0].match)

      return function (args, data) {
        var out = data
        Object.keys(gexers).forEach(function (k) {
          var g = gexers[k]
          var v = null == args[k] ? '' : args[k]
          if (null == g.on(v)) {
            out = null
          }
        })

        if (prevfind && null == out) {
          out = prevfind.call(this, args, prevdata)
        }

        return out
      }
    })

    p2.add({ a: 1, b: '*' }, 'X')

    assert.equal(p2.find({ a: 1 }), 'X')
    assert.equal(p2.find({ a: 1, b: 'x' }), 'X')

    p2.add({ a: 1, b: '*', c: 'q*z' }, 'Y')

    assert.equal(p2.find({ a: 1 }), 'X')
    assert.equal(p2.find({ a: 1, b: 'x' }), 'X')
    assert.equal(p2.find({ a: 1, b: 'x', c: 'qaz' }), 'Y')

    p2.add({ w: 1 }, 'W')
    assert.equal(p2.find({ w: 1 }), 'W')
    assert.equal(p2.find({ w: 1, q: 'x' }), 'W')

    p2.add({ w: 1, q: 'x*' }, 'Q')
    assert.equal(p2.find({ w: 1 }), 'W')
    assert.equal(p2.find({ w: 1, q: 'x' }), 'Q')
    assert.equal(p2.find({ w: 1, q: 'y' }), 'W')
  })

  it('find-exact', async () => {
    var p1 = Patrun()
    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1, b: 2 }, 'B')
    p1.add({ a: 1, b: 2, c: 3 }, 'C')

    assert.equal(p1.find({ a: 1 }), 'A')
    assert.equal(p1.find({ a: 1 }, true), 'A')
    assert.equal(p1.find({ a: 1, b: 8 }), 'A')
    assert.equal(p1.find({ a: 1, b: 8 }, true), null)
    assert.equal(p1.find({ a: 1, b: 8, c: 3 }), 'A')
    assert.equal(p1.find({ a: 1, b: 8, c: 3 }, true), null)

    assert.equal(p1.find({ a: 1, b: 2 }), 'B')
    assert.equal(p1.find({ a: 1, b: 2 }, true), 'B')
    assert.equal(p1.find({ a: 1, b: 2, c: 9 }), 'B')
    assert.equal(p1.find({ a: 1, b: 2, c: 9 }, true), null)

    assert.equal(p1.find({ a: 1, b: 2, c: 3 }), 'C')
    assert.equal(p1.find({ a: 1, b: 2, c: 3 }, true), 'C')
    assert.equal(p1.find({ a: 1, b: 2, c: 3, d: 7 }), 'C')
    assert.equal(p1.find({ a: 1, b: 2, c: 3, d: 7 }, true), null)
  })

  it('list-any', async () => {
    var p1 = Patrun()
    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1, b: 2 }, 'B')
    p1.add({ a: 1, b: 2, c: 3 }, 'C')

    var mA = '{"match":{"a":"1"},"data":"A"}'
    var mB = '{"match":{"a":"1","b":"2"},"data":"B"}'
    var mC = '{"match":{"a":"1","b":"2","c":"3"},"data":"C"}'

    assert.equal(JSON.stringify(p1.list()), '[' + [mA, mB, mC] + ']')

    assert.equal(JSON.stringify(p1.list({ a: 1 })), '[' + [mA, mB, mC] + ']')
    assert.equal(JSON.stringify(p1.list({ b: 2 })), '[' + [mB, mC] + ']')
    assert.equal(JSON.stringify(p1.list({ c: 3 })), '[' + [mC] + ']')

    assert.equal(JSON.stringify(p1.list({ a: '*' })), '[' + [mA, mB, mC] + ']')
    assert.equal(JSON.stringify(p1.list({ b: '*' })), '[' + [mB, mC] + ']')
    assert.equal(JSON.stringify(p1.list({ c: '*' })), '[' + [mC] + ']')

    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: 2 })),
      '[' + [mB, mC] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: '*' })),
      '[' + [mB, mC] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: '*', c: 3 })),
      '[' + [mC] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: '*', c: '*' })),
      '[' + [mC] + ']',
    )

    assert.equal(JSON.stringify(p1.list({ a: 1, c: '*' })), '[' + [mC] + ']')

    // test star descent

    p1.add({ a: 1, d: 4 }, 'D')
    var mD = '{"match":{"a":"1","d":"4"},"data":"D"}'

    assert.equal(JSON.stringify(p1.list()), '[' + [mA, mB, mC, mD] + ']')
    assert.equal(
      JSON.stringify(p1.list({ a: 1 })),
      '[' + [mA, mB, mC, mD] + ']',
    )
    assert.equal(JSON.stringify(p1.list({ d: 4 })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ a: 1, d: 4 })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ a: 1, d: '*' })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ d: '*' })), '[' + [mD] + ']')

    p1.add({ a: 1, c: 33 }, 'CC')
    var mCC = '{"match":{"a":"1","c":"33"},"data":"CC"}'

    assert.equal(
      JSON.stringify(p1.list()),
      '[' + [mA, mB, mC, mCC, mD] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1 })),
      '[' + [mA, mB, mC, mCC, mD] + ']',
    )

    assert.equal(JSON.stringify(p1.list({ d: 4 })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ a: 1, d: 4 })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ a: 1, d: '*' })), '[' + [mD] + ']')
    assert.equal(JSON.stringify(p1.list({ d: '*' })), '[' + [mD] + ']')

    assert.equal(JSON.stringify(p1.list({ c: 33 })), '[' + [mCC] + ']')
    assert.equal(JSON.stringify(p1.list({ a: 1, c: 33 })), '[' + [mCC] + ']')
    assert.equal(
      JSON.stringify(p1.list({ a: 1, c: '*' })),
      '[' + [mC, mCC] + ']',
    )
    assert.equal(JSON.stringify(p1.list({ c: '*' })), '[' + [mC, mCC] + ']')

    // exact
    assert.equal(JSON.stringify(p1.list({ a: 1 }, true)), '[' + [mA] + ']')
    assert.equal(JSON.stringify(p1.list({ a: '*' }, true)), '[' + [mA] + ']')
    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: 2 }, true)),
      '[' + [mB] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1, b: '*' }, true)),
      '[' + [mB] + ']',
    )
    assert.equal(JSON.stringify(p1.list({ a: 1, c: 3 }, true)), '[]')
    assert.equal(
      JSON.stringify(p1.list({ a: 1, c: 33 }, true)),
      '[' + [mCC] + ']',
    )
    assert.equal(
      JSON.stringify(p1.list({ a: 1, c: '*' }, true)),
      '[' + [mCC] + ']',
    )
  })

  it('top-custom', async () => {
    var p1 = Patrun(function (pat, data) {
      return function (args, data) {
        data += '!'
        return data
      }
    })

    p1.add({}, 'Q')
    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1, b: 2 }, 'B')
    p1.add({ a: 1, b: 2, c: 3 }, 'C')

    assert.equal(p1.find({}), 'Q!')
    assert.equal(p1.find({ a: 1 }), 'A!')
    assert.equal(p1.find({ a: 1, b: 2 }), 'B!')
    assert.equal(p1.find({ a: 1, b: 2, c: 3 }), 'C!')
  })

  it('mixed-values', async () => {
    var p1 = Patrun()

    p1.add({ a: 1 }, 'A')
    p1.add({ a: true }, 'AA')
    p1.add({ a: 0 }, 'AAA')
    p1.add({ a: 'A', b: 2 }, 'B')
    p1.add({ a: 'A', b: 'B', c: 3 }, 'C')

    assert.equal(p1.find({ a: 1 }), 'A')
    assert.equal(p1.find({ a: true }), 'AA')
    assert.equal(p1.find({ a: 0 }), 'AAA')
    assert.equal(p1.find({ a: 'A', b: 2 }), 'B')
    assert.equal(p1.find({ a: 'A', b: 'B', c: 3 }), 'C')

    assert.equal(p1.list({ a: 1 }).length, 1)
    assert.equal(p1.list({ a: true }).length, 1)
    assert.equal(p1.list({ a: 0 }).length, 1)

    p1.add({}, 'Q')
    assert.equal(p1.find({}), 'Q')
  })

  it('no-props', async () => {
    var p1 = Patrun()
    p1.add({}, 'Z')
    assert.equal(p1.find({}), 'Z')

    p1.add({ a: 1 }, 'X')
    assert.equal(p1.find({}), 'Z')

    p1.add({ b: 2 }, 'Y')
    assert.equal(p1.find({}), 'Z')

    p1.remove({ b: 2 })
    assert.equal(p1.find({}), 'Z')
  })

  it('zero', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'X')
    assert.equal(p1.find({ a: 0 }), 'X')
  })

  it('multi-match', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ b: 1 }, 'Q')
    p1.add({ c: 2 }, 'R')

    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0, c: 2 }), 'P')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'P')
    assert.equal(p1.find({ a: 0, c: 2 }), 'P')
    assert.equal(p1.find({ b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ c: 2 }), 'R')

    p1.add({ a: 0, b: 1 }, 'S')
    assert.equal(p1.find({ a: 0, b: 1 }), 'S')
    assert.equal(p1.find({ a: 0, c: 2 }), 'P')

    p1.add({ b: 1, c: 2 }, 'T')
    assert.equal(p1.find({ a: 0, b: 1 }), 'S')
    assert.equal(p1.find({ a: 0, c: 2 }), 'P')
    assert.equal(p1.find({ b: 1, c: 2 }), 'T')

    p1.add({ d: 3 }, 'U')
    assert.equal(p1.find({ d: 3 }), 'U')
    assert.equal(p1.find({ a: 0, d: 3 }), 'P')
    assert.equal(p1.find({ b: 1, d: 3 }), 'Q')
    assert.equal(p1.find({ c: 2, d: 3 }), 'R')

    p1.add({ c: 2, d: 3 }, 'V')
    assert.equal(p1.find({ c: 2, d: 3 }), 'V')
    assert.equal(p1.find({ a: 0, b: 1 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, d: 3 }), 'S')
  })

  it('partial-match', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ a: 0, b: 1, c: 2 }, 'Q')

    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')

    p1.add({ a: 0, d: 3 }, 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')

    p1.add({ a: 0, b: 1, c: 2, e: 4, f: 5 }, 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), 'Q')

    p1.add({ a: 0, b: 1 }, 'M')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'M')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), 'Q')

    p1.add({ a: 0, b: 1, c: 2, e: 4 }, 'N')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'M')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), 'N')
  })

  it('partial-match-remove', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ a: 0, b: 1, c: 2 }, 'Q')

    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')

    p1.add({ a: 0, d: 3 }, 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')

    p1.add({ a: 0, b: 1, c: 2, e: 4, f: 5 }, 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), 'P')
    assert.equal(p1.find({ a: 0 }), 'P')
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), 'Q')

    p1.remove({ a: 0 })
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), 'Q')
    assert.equal(p1.find({ a: 0, b: 1 }), null)
    assert.equal(p1.find({ a: 0 }), null)
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), 'Q')

    p1.remove({ a: 0, b: 1, c: 2 })
    assert.equal(p1.find({ a: 0, b: 1, c: 2 }), null)
    assert.equal(p1.find({ a: 0, b: 1 }), null)
    assert.equal(p1.find({ a: 0 }), null)
    assert.equal(p1.find({ a: 0, d: 3 }), 'S')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 }), 'T')
    assert.equal(p1.find({ a: 0, b: 1, c: 2, e: 4 }), null)
  })

  it('top', async () => {
    var r = Patrun()
    r.add({}, 'R')
    assert.deepStrictEqual(r.top(), { d: 'R' })
  })

  it('add-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 'A' }, 'XA')
    assert.equal(p1.find({ a: 'A' }), 'XA')
    assert.equal(p1.find({}), null)

    p1.add({ b: '*' }, 'XB')
    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ b: 'B' }), 'XB')
    assert.equal(p1.find({ b: '0' }), 'XB')
    assert.equal(p1.find({ b: 2 }), 'XB')
    assert.equal(p1.find({ b: 1 }), 'XB')
    assert.equal(p1.find({ b: 0 }), 'XB')
    assert.equal(p1.find({ b: '' }), 'XB') // this is correct
    assert.equal(p1.find({}), null)

    p1.add({ c: '*' }, 'XC')
    assert.equal(p1.find({ c: 'A' }), 'XC')
    assert.equal(p1.find({ c: 'B' }), 'XC')
    assert.equal(p1.find({ c: '0' }), 'XC')
    assert.equal(p1.find({ c: 2 }), 'XC')
    assert.equal(p1.find({ c: 1 }), 'XC')
    assert.equal(p1.find({ c: 0 }), 'XC')
    assert.equal(p1.find({ c: '' }), 'XC') // this is correct
    assert.equal(p1.find({}), null)

    assert.equal(p1.find({ b: 'A', c: 'A' }), 'XB')

    p1.add({ e: '*' }, 'XE')
    p1.add({ d: '*' }, 'XD')

    // alphanumeric ordering
    assert.equal(p1.find({ d: 'A', e: 'A' }), 'XD')

    p1.add({ b: 0 }, 'XB0')

    p1.add({ b: 'B' }, 'XBB')
    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ b: 0 }), 'XB0')
    assert.equal(p1.find({ b: 'B' }), 'XBB')
  })

  it('add-mixed-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: '*' }, 'XAS')
    p1.add({ a: 'A' }, 'XA')

    p1.add({ b: 'A' }, 'XB')
    p1.add({ b: '*' }, 'XBS')

    assert.equal(p1.find({ a: 'A' }), 'XA')
    assert.equal(p1.find({ a: 'Q' }), 'XAS')

    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ b: 'Q' }), 'XBS')

    p1.add({ c: 'B' }, 'XCB')
    p1.add({ c: 'A' }, 'XCA')
    p1.add({ c: '*b' }, 'XCBe')
    p1.add({ c: '*a' }, 'XCAe')
    p1.add({ c: 'b*' }, 'XCsB')
    p1.add({ c: 'a*' }, 'XCsA')

    assert.equal(p1.find({ c: 'A' }), 'XCA')
    assert.equal(p1.find({ c: 'B' }), 'XCB')
    assert.equal(p1.find({ c: 'qb' }), 'XCBe')
    assert.equal(p1.find({ c: 'qa' }), 'XCAe')
    assert.equal(p1.find({ c: 'bq' }), 'XCsB')
    assert.equal(p1.find({ c: 'aq' }), 'XCsA')

    assert.equal(p1.find({ a: 'A' }), 'XA')
    assert.equal(p1.find({ a: 'Q' }), 'XAS')
    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ b: 'Q' }), 'XBS')
  })

  it('add-order-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ c: 'A' }, 'XC')
    p1.add({ c: '*' }, 'XCS')

    p1.add({ a: 'A' }, 'XA')
    p1.add({ a: '*' }, 'XAS')

    p1.add({ b: 'A' }, 'XB')
    p1.add({ b: '*' }, 'XBS')

    assert.equal(p1.find({ c: 'A' }), 'XC')
    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ a: 'A' }), 'XA')

    assert.equal(p1.find({ c: 'Q' }), 'XCS')
    assert.equal(p1.find({ b: 'Q' }), 'XBS')
    assert.equal(p1.find({ a: 'Q' }), 'XAS')
  })

  it('multi-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 1, b: 2 }, 'Xa1b2')
    p1.add({ a: 1, b: '*' }, 'Xa1b*')
    p1.add({ a: 1, c: 3 }, 'Xa1c3')
    p1.add({ a: 1, c: '*' }, 'Xa1c*')
    p1.add({ a: 1, b: 4, c: 5 }, 'Xa1b4c5')
    p1.add({ a: 1, b: '*', c: 5 }, 'Xa1b*c5')
    p1.add({ a: 1, b: 4, c: '*' }, 'Xa1b4c*')
    p1.add({ a: 1, b: '*', c: '*' }, 'Xa1b*c*')

    assert.equal(p1.find({ a: 1, b: 2 }), 'Xa1b2')
    assert.equal(p1.find({ a: 1, b: 0 }), 'Xa1b*')
    assert.equal(p1.find({ a: 1, c: 3 }), 'Xa1c3')
    assert.equal(p1.find({ a: 1, c: 0 }), 'Xa1c*')
    assert.equal(p1.find({ a: 1, b: 4, c: 5 }), 'Xa1b4c5')
    assert.equal(p1.find({ a: 1, b: 0, c: 5 }), 'Xa1b*c5')
    assert.equal(p1.find({ a: 1, b: 4, c: 0 }), 'Xa1b4c*')
    assert.equal(p1.find({ a: 1, b: 0, c: 0 }), 'Xa1b*c*')
  })

  it('remove-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 'A' }, 'XA')
    assert.equal(p1.find({ a: 'A' }), 'XA')
    assert.equal(p1.find({}), null)

    p1.add({ b: '*' }, 'XB')
    assert.equal(p1.find({ b: 'A' }), 'XB')
    assert.equal(p1.find({ b: 'B' }), 'XB')
    assert.equal(p1.find({}), null)
    assert.equal(p1.find({ a: 'A' }), 'XA')

    p1.remove({ b: '*' })
    assert.equal(p1.find({ b: 'A' }), null)
    assert.equal(p1.find({ b: 'B' }), null)
    assert.equal(p1.find({}), null)
    assert.equal(p1.find({ a: 'A' }), 'XA')
  })

  it('add-interval', async () => {
    var p1 = Patrun({ interval: true })

    p1.add({ a: 'A' }, 'XA')
    assert.equal(p1.find({ a: 'A' }), 'XA')
    assert.equal(p1.find({}), null)

    p1.add({ b: '>10' }, 'XB')

    assert.equal(p1.find({ b: 11 }), 'XB')
    assert.equal(p1.find({ b: 12.5 }), 'XB')
    assert.equal(p1.find({ b: '11' }), 'XB')
    assert.equal(p1.find({ b: '12.5' }), 'XB')
    assert.equal(p1.find({ b: 1 }), null)
    assert.equal(p1.find({ b: 0 }), null)
    assert.equal(p1.find({ b: '' }), null)
    assert.equal(p1.find({}), null)
  })

  it('add-gex-interval', async () => {
    var p1 = Patrun({ gex: true, interval: true })

    p1.add({ a: 'A', c: '>10&<20', e: '*a' }, 'A0')
    assert.equal(p1.find({ a: 'A', c: 11, e: 'xa' }), 'A0')
    assert.equal(p1.find({ a: 'B', c: 11, e: 'xa' }), null)
    assert.equal(p1.find({ a: 'A', c: 9, e: 'xa' }), null)
    assert.equal(p1.find({ a: 'A', c: 11, e: 'ax' }), null)

    // ensure key path ordering is preserved
    p1.add({ a: 'A', b: 'B' }, 'AB0')
    assert.equal(p1.find({ a: 'A', b: 'B' }), 'AB0')
    assert.equal(p1.find({ a: 'A', c: 11, e: 'xa' }), 'A0')

    // uses vm arrays
    p1.add({ a: 'A', c: '<=10' }, 'AC0')
    assert.equal(p1.find({ a: 'A', b: 'B' }), 'AB0')
    assert.equal(p1.find({ a: 'A', c: 11, e: 'xa' }), 'A0')
    assert.equal(p1.find({ a: 'A', c: 9 }), 'AC0')
  })

  it('collect-once', async () => {
    var p1 = Patrun({ gex: true })
    p1.add({ d: 1, b: 1, a: 1 }, 'A')
    p1.add({ d: 1 }, 'B')
    assert.deepStrictEqual(p1.find({ d: 1, b: 1 }, false, true), ['B'])

    var p2 = Patrun({ gex: true })
    p2.add({ d: 1, b: 1, c: 1 }, 'A')
    p2.add({ d: 1 }, 'B')
    assert.deepStrictEqual(p2.find({ d: 1, b: 1 }, false, true), ['B'])

    var p3 = Patrun({ gex: true })
    p3.add({ d: 1, b: 1, e: 1 }, 'A')
    p3.add({ d: 1 }, 'B')
    assert.deepStrictEqual(p3.find({ d: 1, b: 1 }, false, true), ['B'])
  })

  it('collect-powerset', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 1, b: 2 }, 'AB')
    p1.add({ a: 1, c: 3 }, 'AC')
    p1.add({ b: 2, c: 3 }, 'BC')
    p1.add({ a: 1, d: 4 }, 'AD')

    assert.deepStrictEqual(p1.find({ a: 1, b: 2, x: 1 }, false, true), ['AB'])
    assert.deepStrictEqual(p1.find({ a: 1, c: 3, x: 1 }, false, true), ['AC'])
    assert.deepStrictEqual(p1.find({ b: 2, c: 3, x: 1 }, false, true), ['BC'])
    assert.deepStrictEqual(p1.find({ a: 1, d: 4, x: 1 }, false, true), ['AD'])

    assert.equal(p1.find({ a: 1, b: 2, c: 3 }, false), 'AB')
    assert.equal(p1.find({ a: 1, b: 2, c: 3 }, true), null)
    assert.deepStrictEqual(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true), [
      'AB',
      'AC',
      'BC',
    ])

    p1.add({ b: 1, e: 5 }, 'BE')
    assert.deepStrictEqual(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true), [
      'AB',
      'AC',
      'BC',
    ])

    p1.add({ a: 1, b: 2, c: 3 }, 'ABC')
    assert.deepStrictEqual(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true), [
      'AB',
      'ABC',
      'AC',
      'BC',
    ])

    assert.deepStrictEqual(p1.find({ a: 1, b: 2, d: 4, x: 2 }, false, true), ['AB', 'AD'])
    assert.deepStrictEqual(p1.find({ a: 1, b: 2, c: 3, d: 4, x: 2 }, false, true), [
      'AB',
      'ABC',
      'AC',
      'AD',
      'BC',
    ])
  })
})
