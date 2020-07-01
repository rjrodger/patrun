/* Copyright (c) 2013-2019 Richard Rodger and other contributors, MIT License */
'use strict'

var Lab = require('@hapi/lab')
var Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Patrun = require('..')
var Gex = require('gex')

function rs(x) {
  return x.toString(true).replace(/\s+/g, '').replace(/\n+/g, '')
}

describe('patrun', function () {
  it('toString', async () => {
    var r = Patrun()
    r.add({}, 'R')
    expect(r.toString(true)).to.equal(' <R>')
    expect(r.toString(false)).to.equal(' -> <R>')
    expect(r.toString((d) => 'D:' + d)).to.equal(' -> D:R')
    expect(r.toString((d) => 'D:' + d, true)).to.equal(' D:R')
    expect(r.toString((d) => 'D:' + d, false)).to.equal(' -> D:R')

    r.add({ a: 1 }, 'S')
    expect(r.toString(true)).to.equal(' <R>\na:\n 1 -> <S>')
    expect(r.toString(false)).to.equal(' -> <R>\na=1 -> <S>')
    expect(r.toString((d) => 'D:' + d)).to.equal(' -> D:R\na=1 -> D:S')
    expect(r.toString((d) => 'D:' + d, true)).to.equal(' D:R\na:\n 1 -> D:S')
    expect(r.toString((d) => 'D:' + d, false)).to.equal(' -> D:R\na=1 -> D:S')

    r.add({ a: 1, b: 2 }, function foo() {})
    expect(r.toString(true)).to.equal(
      ' <R>\na:\n 1 -> <S>\n  b:\n   2 -> <foo>'
    )
    expect(r.toString(false)).to.equal(' -> <R>\na=1 -> <S>\na=1, b=2 -> <foo>')
    expect(r.toString((d) => 'D:' + d)).to.equal(
      ' -> D:R\na=1 -> D:S\na=1, b=2 -> D:function foo() {}'
    )
    expect(r.toString((d) => 'D:' + d, true)).to.equal(
      ' D:R\na:\n 1 -> D:S\n  b:\n   2 -> D:function foo() {}'
    )
    expect(r.toString((d) => 'D:' + d, false)).to.equal(
      ' -> D:R\na=1 -> D:S\na=1, b=2 -> D:function foo() {}'
    )
  })

  it('empty', async () => {
    var r = Patrun()
    expect(r.toString()).to.equal('')

    expect(r.find(NaN)).to.not.exist()
    expect(r.find(void 0)).to.not.exist()
    expect(r.find(null)).to.not.exist()
    expect(r.find({})).to.not.exist()
    expect(r.find({ a: 1 })).to.not.exist()

    r.add({ a: 1 }, 'A')

    expect(r.find(NaN)).to.not.exist()
    expect(r.find(void 0)).to.not.exist()
    expect(r.find(null)).to.not.exist()
    expect(r.find({})).to.not.exist()
    expect(r.find({ a: 1 })).to.equal('A')
  })

  it('root-data', async () => {
    var r = Patrun()
    r.add({}, 'R')
    expect('' + r).to.equal(' -> <R>')
    expect(rs(r)).to.equal('<R>')
    expect(JSON.stringify(r.list())).to.equal('[{"match":{},"data":"R"}]')

    expect(r.find({})).to.equal('R')
    expect(r.find({ x: 1 })).to.equal('R')

    r.add({ a: '1' }, 'r1')
    expect('' + r).to.equal(' -> <R>\na=1 -> <r1>')
    expect(rs(r)).to.equal('<R>a:1-><r1>')

    expect(r.find({ x: 1 })).equal('R')
    expect(r.find({ a: 1 })).equal('r1')
    expect(r.find({ a: 2 })).equal('R')

    r.add({ a: '1', b: '1' }, 'r2')
    expect(r.find({ x: 1 })).equal('R')
    expect(r.find({ a: 1 })).equal('r1')
    expect(r.find({ a: 1, b: 1 })).equal('r2')
    expect(r.find({ a: 2 })).equal('R')
    expect(r.find({ a: 1, b: 2 })).equal('r1') // a:1 is defined
    expect(r.find({ a: 1, b: 2 }, true)).equal(null) // exact must be ... exact
    expect(r.find({ a: 2, b: 2 })).equal('R')
    expect(r.find({ b: 2 })).equal('R')

    r.add({ x: '1', y: '1' }, 'r3')
    expect(r.find({ x: 1 })).equal('R')

    expect(r.find({ x: 1 }, true)).equal(null)

    expect(JSON.stringify(r.list())).equal(
      '[{"match":{},"data":"R"},{"match":{"a":"1"},"data":"r1"},{"match":{"a":"1","b":"1"},"data":"r2"},{"match":{"x":"1","y":"1"},"data":"r3"}]'
    )
  })

  it('add', async () => {
    var r

    r = Patrun()
    r.add({ a: '1' }, 'r1')
    expect('' + r).to.equal('a=1 -> <r1>')
    expect(rs(r)).to.equal('a:1-><r1>')

    expect(JSON.stringify(r.list())).to.equal(
      '[{"match":{"a":"1"},"data":"r1"}]'
    )

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    expect(rs(r)).to.equal('a:1->b:2-><r1>')

    r = Patrun()
    r.add({ a: '1', b: '2', c: '3' }, 'r1')
    expect(rs(r)).to.equal('a:1->b:2->c:3-><r1>')

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    r.add({ a: '1', b: '3' }, 'r2')
    expect('' + r).to.equal('a=1, b=2 -> <r1>\na=1, b=3 -> <r2>')
    expect(rs(r)).to.equal('a:1->b:2-><r1>3-><r2>')

    r = Patrun()
    r.add({ a: '1', b: '2' }, 'r1')
    r.add({ a: '1', c: '3' }, 'r2')
    expect(rs(r)).to.equal('a:1->b:2-><r1>|c:3-><r2>')

    r.add({ a: '1', d: '4' }, 'r3')
    expect(rs(r)).to.equal('a:1->b:2-><r1>|c:3-><r2>|d:4-><r3>')

    r = Patrun()
    r.add({ a: '1', c: '2' }, 'r1')
    r.add({ a: '1', b: '3' }, 'r2')
    expect(rs(r)).to.equal('a:1->b:3-><r2>|c:2-><r1>')

    expect(JSON.stringify(r.list())).to.equal(
      '[{"match":{"a":"1","b":"3"},"data":"r2"},{"match":{"a":"1","c":"2"},"data":"r1"}]'
    )
  })

  it('basic', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 'v1' }, 'r1')
    expect('r1').to.equal(rt1.find({ p1: 'v1' }))
    expect(null).to.equal(rt1.find({ p2: 'v1' }))

    rt1.add({ p1: 'v1' }, 'r1x')
    expect('r1x').to.equal(rt1.find({ p1: 'v1' }))
    expect(null).to.equal(rt1.find({ p2: 'v1' }))

    rt1.add({ p1: 'v2' }, 'r2')
    expect('r2').to.equal(rt1.find({ p1: 'v2' }))
    expect(null).to.equal(rt1.find({ p2: 'v2' }))

    rt1.add({ p2: 'v3' }, 'r3')
    expect('r3').to.equal(rt1.find({ p2: 'v3' }))
    expect(null).to.equal(rt1.find({ p2: 'v2' }))
    expect(null).to.equal(rt1.find({ p2: 'v1' }))

    rt1.add({ p1: 'v1', p3: 'v4' }, 'r4')
    expect('r4').to.equal(rt1.find({ p1: 'v1', p3: 'v4' }))
    expect('r1x').to.equal(rt1.find({ p1: 'v1', p3: 'v5' }))
    expect(null).to.equal(rt1.find({ p2: 'v1' }))
  })

  it('culdesac', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 'v1' }, 'r1')
    rt1.add({ p1: 'v1', p2: 'v2' }, 'r2')
    rt1.add({ p1: 'v1', p3: 'v3' }, 'r3')

    expect('r1').to.equal(rt1.find({ p1: 'v1', p2: 'x' }))
    expect('r3').to.equal(rt1.find({ p1: 'v1', p2: 'x', p3: 'v3' }))
  })

  it('falsy-values', async () => {
    var rt1 = Patrun()

    rt1.add({ p1: 0 }, 'r1')
    rt1.add({ p1: 0, p2: '' }, 'r2')
    rt1.add({ p1: 0, p2: '', p3: false }, 'r3')

    expect(null).to.equal(rt1.find({ p1: null }))
    expect('r1').to.equal(rt1.find({ p1: 0 }))
    expect('r2').to.equal(rt1.find({ p1: 0, p2: '' }))
    expect('r3').to.equal(rt1.find({ p1: 0, p2: '', p3: false }))

    expect(rt1.list().map((x) => x.data)).equal(['r1', 'r2', 'r3'])
    expect(rt1.list({}).map((x) => x.data)).equal(['r1', 'r2', 'r3'])
    expect(rt1.list({}, true).map((x) => x.data)).equal([])

    expect(rt1.list({ p1: 0 }).map((x) => x.data)).equal(['r1', 'r2', 'r3'])
    expect(rt1.list({ p2: '' }).map((x) => x.data)).equal(['r2', 'r3'])
    expect(rt1.list({ p3: false }).map((x) => x.data)).equal(['r3'])

    expect(rt1.list({ p1: 0 }, true).map((x) => x.data)).equal(['r1'])
    expect(rt1.list({ p1: 0, p2: '' }, true).map((x) => x.data)).equal(['r2'])
    expect(
      rt1.list({ p1: 0, p2: '', p3: false }, true).map((x) => x.data)
    ).equal(['r3'])

    expect(rt1.list({ p2: '' }, true).map((x) => x.data)).equal([])
    expect(rt1.list({ p2: '', p3: false }, true).map((x) => x.data)).equal([])
    expect(rt1.list({ p3: false }, true).map((x) => x.data)).equal([])
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

    //console.log(''+rt1)
    //console.log(rt1.toString(true))

    expect('r1').to.equal(rt1.find({ p1: 'v1' }, true)) // exact
    expect('r1').to.equal(rt1.find({ p1: 'v1' }, false)) // not exact
    expect(null).to.equal(rt1.find({ p1: 'v1', p2: 'x' }, true)) // exact
    expect('r1').to.equal(rt1.find({ p1: 'v1', p2: 'x' }, false)) // not exact
    expect('r2').to.equal(rt1.find({ p1: 'v1', p2: 'v2' }, false)) // not exact
    expect('r2').to.equal(rt1.find({ p1: 'v1', p2: 'v2' }, true)) // exact

    expect(rt1.find({ p1: 'x' }, false, true)).equal([])
    expect(rt1.find({ p1: 'v1' }, false, true)).equal(['r1'])
    expect(rt1.find({ p1: 'x' }, true, true)).equal([])
    expect(rt1.find({ p1: 'v1' }, true, true)).equal(['r1'])

    // there only is a matching trail
    expect(rt1.find({ p1: 'v1', p2: 'v2' }, false, true)).equal(['r1', 'r2'])
    expect(rt1.find({ p1: 'v1', p3: 'v3' }, false, true)).equal(['r1', 'r3'])

    // just follows matching trail
    expect(rt1.find({ p1: 'v1', p2: 'v2' }, true, true)).equal(['r1', 'r2'])
    expect(rt1.find({ p1: 'v1', p3: 'v3' }, true, true)).equal(['r1', 'r3'])

    expect(rt1.find({ q1: 'x' }, false, true)).equal([])
    expect(rt1.find({ q1: 'w1' }, false, true)).equal(['s1'])
    expect(rt1.find({ q1: 'x' }, true, true)).equal([])
    expect(rt1.find({ q1: 'w1' }, true, true)).equal(['s1'])

    expect(rt1.find({ q2: 'x' }, false, true)).equal([])
    expect(rt1.find({ q2: 'w2' }, false, true)).equal(['s4'])
    expect(rt1.find({ q2: 'x' }, true, true)).equal([])
    expect(rt1.find({ q2: 'w2' }, true, true)).equal(['s4'])

    // followed a remainder path (q1 removed)
    expect(rt1.find({ q1: 'w1', q2: 'w2' }, false, true).sort()).equal(
      ['s4', 's1', 's2'].sort()
    )
    expect(rt1.find({ q1: 'w1', q3: 'w3' }, false, true)).equal(['s1', 's3'])

    // but exact does not follow remainders
    expect(rt1.find({ q1: 'w1', q2: 'w2' }, true, true)).equal(['s1', 's2'])
    expect(rt1.find({ q1: 'w1', q3: 'w3' }, true, true)).equal(['s1', 's3'])

    // add another remainder trail
    rt1.add({ q3: 'w3' }, 's5')

    // followed a remainder path (q1 removed)
    expect(rt1.find({ q1: 'w1', q2: 'w2' }, false, true).sort()).equal(
      ['s4', 's1', 's2'].sort()
    )
    expect(rt1.find({ q1: 'w1', q3: 'w3' }, false, true).sort()).equal(
      ['s5', 's1', 's3'].sort()
    )

    // but exact does not follow remainders
    expect(rt1.find({ q1: 'w1', q2: 'w2' }, true, true)).equal(['s1', 's2'])
    expect(rt1.find({ q1: 'w1', q3: 'w3' }, true, true)).equal(['s1', 's3'])

    expect(rt1.find({ q1: 'x' }, false, true)).equal([])
    expect(rt1.find({ q1: 'w1' }, false, true)).equal(['s1'])
    expect(rt1.find({ q1: 'x' }, true, true)).equal([])
    expect(rt1.find({ q1: 'w1' }, true, true)).equal(['s1'])

    expect(rt1.find({ q2: 'x' }, false, true)).equal([])
    expect(rt1.find({ q2: 'w2' }, false, true)).equal(['s4'])
    expect(rt1.find({ q2: 'x' }, true, true)).equal([])
    expect(rt1.find({ q2: 'w2' }, true, true)).equal(['s4'])

    expect(rt1.find({ q3: 'x' }, false, true)).equal([])
    expect(rt1.find({ q3: 'w3' }, false, true)).equal(['s5'])
    expect(rt1.find({ q3: 'x' }, true, true)).equal([])
    expect(rt1.find({ q3: 'w3' }, true, true)).equal(['s5'])

    // add a top
    rt1.add({}, 't')
    expect(rt1.find({}, false, true)).equal(['t'])

    expect(rt1.find({ q1: 'x' }, false, true)).equal(['t'])
    expect(rt1.find({ q1: 'w1' }, false, true)).equal(['t', 's1'])
    expect(rt1.find({ q1: 'x' }, true, true)).equal(['t'])
    expect(rt1.find({ q1: 'w1' }, true, true)).equal(['t', 's1'])

    // followed a remainder path (q1 removed)
    expect(rt1.find({ q1: 'w1', q2: 'w2' }, false, true)).equal([
      't',
      's1',
      's2',
      's4',
    ])
    expect(rt1.find({ q1: 'w1', q3: 'w3' }, false, true)).equal([
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
    expect('r0').to.equal(rt1.find({ p1: 'v1' }))

    rt1.remove({ p1: 'v1' })
    expect(null).to.equal(rt1.find({ p1: 'v1' }))

    rt1.add({ p2: 'v2', p3: 'v3' }, 'r1')
    rt1.add({ p2: 'v2', p4: 'v4' }, 'r2')
    expect('r1').to.equal(rt1.find({ p2: 'v2', p3: 'v3' }))
    expect('r2').to.equal(rt1.find({ p2: 'v2', p4: 'v4' }))

    rt1.remove({ p2: 'v2', p3: 'v3' })
    expect(null).to.equal(rt1.find({ p2: 'v2', p3: 'v3' }))
    expect('r2').to.equal(rt1.find({ p2: 'v2', p4: 'v4' }))
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
      expect(found).equal([
        { match: { p1: 'v1' }, data: 'r0', find: undefined },
        { match: { p1: 'v1', p2: 'v2a' }, data: 'r1', find: undefined },
        { match: { p1: 'v1', p2: 'v2b' }, data: 'r2', find: undefined },
      ])

      found = rt1.list({ p1: 'v1', p2: '*' })
      expect(found).equal([
        { match: { p1: 'v1', p2: 'v2a' }, data: 'r1', find: undefined },
        { match: { p1: 'v1', p2: 'v2b' }, data: 'r2', find: undefined },
      ])

      rt1.add({ p1: 'v1', p2: 'v2c', p3: 'v3a' }, 'r3a')
      rt1.add({ p1: 'v1', p2: 'v2d', p3: 'v3b' }, 'r3b')
      found = rt1.list({ p1: 'v1', p2: '*', p3: 'v3a' })
      expect(found).equal([
        {
          match: { p1: 'v1', p2: 'v2c', p3: 'v3a' },
          data: 'r3a',
          find: undefined,
        },
      ])

      // gex can accept a list of globs
      found = rt1.list({ p1: 'v1', p2: ['v2a', 'v2b', 'not-a-value'] })
      expect(found).equal([
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
    expect('{"d":"r1"}').to.equal(rt1.toJSON())

    rt1.add({ p2: void 0 }, 'r2')
    expect('{"d":"r2"}').to.equal(rt1.toJSON())

    rt1.add({ p99: 'v99' }, 'r99')
    expect('{"d":"r2","k":"p99","sk":"0~p99","v":{"v99":{"d":"r99"}}}').equal(
      rt1.toJSON()
    )
  })

  it('multi-star', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'A')
    p.add({ a: 1, b: 2 }, 'B')
    p.add({ c: 3 }, 'C')
    p.add({ b: 1, c: 4 }, 'D')

    expect(rs(p)).to.equal('a:1-><A>b:2-><B>|b:1->c:4-><D>|c:3-><C>')
    expect('' + p).to.equal(
      'a=1 -> <A>\na=1, b=2 -> <B>\nb=1, c=4 -> <D>\nc=3 -> <C>'
    )

    expect(p.find({ c: 3 })).to.equal('C')
    expect(p.find({ c: 3, a: 0 })).to.equal('C')
    expect(p.find({ c: 3, a: 0, b: 0 })).to.equal('C')
  })

  it('star-backtrack', async () => {
    var p = Patrun()

    p.add({ a: 1, b: 2 }, 'X')
    p.add({ c: 3 }, 'Y')

    expect(p.find({ a: 1, b: 2 })).to.equal('X')
    expect(p.find({ a: 1, b: 0, c: 3 })).to.equal('Y')

    p.add({ a: 1, b: 2, d: 4 }, 'XX')
    p.add({ c: 3, d: 4 }, 'YY')

    expect(p.find({ a: 1, b: 2, d: 4 })).to.equal('XX')
    expect(p.find({ a: 1, c: 3, d: 4 })).to.equal('YY')
    expect(p.find({ a: 1, b: 2 })).to.equal('X')
    expect(p.find({ a: 1, b: 0, c: 3 })).to.equal('Y')

    expect(p.list({ a: 1, b: '*' })[0].data).to.equal('X')
    expect(p.list({ c: 3 })[0].data).to.equal('Y')
    expect(p.list({ c: 3, d: '*' })[0].data).to.equal('YY')
    expect(p.list({ a: 1, b: '*', d: '*' })[0].data).to.equal('XX')

    expect('' + p).to.equal(
      'a=1, b=2 -> <X>\na=1, b=2, d=4 -> <XX>\nc=3 -> <Y>\nc=3, d=4 -> <YY>'
    )
  })

  it('remove-intermediate', async () => {
    var p = Patrun()

    p.add({ a: 1, b: 2, d: 4 }, 'XX')
    p.add({ c: 3, d: 4 }, 'YY')
    p.add({ a: 1, b: 2 }, 'X')
    p.add({ c: 3 }, 'Y')

    p.remove({ c: 3 })

    expect(p.find({ c: 3 })).to.not.exist()
    expect(p.find({ a: 1, c: 3, d: 4 })).to.equal('YY')
    expect(p.find({ a: 1, b: 2, d: 4 })).to.equal('XX')
    expect(p.find({ a: 1, b: 2 })).to.equal('X')

    p.remove({ a: 1, b: 2 })

    expect(p.find({ c: 3 })).to.not.exist()
    expect(p.find({ a: 1, c: 3, d: 4 })).to.equal('YY')
    expect(p.find({ a: 1, b: 2, d: 4 })).to.equal('XX')
    expect(p.find({ a: 1, b: 2 })).to.not.exist()
  })

  it('exact', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'X')

    expect(p.findexact({ a: 1 })).to.equal('X')
    expect(p.findexact({ a: 1, b: 2 })).to.not.exist()
  })

  it('all', async () => {
    var p = Patrun()

    p.add({ a: 1 }, 'X')
    p.add({ b: 2 }, 'Y')

    expect(JSON.stringify(p.list())).to.equal(
      '[{"match":{"a":"1"},"data":"X"},{"match":{"b":"2"},"data":"Y"}]'
    )
  })

  it('custom-happy', async () => {
    var p1 = Patrun(function (pat) {
      pat.q = 9
    })

    p1.add({ a: 1 }, 'Q')

    expect(p1.find({ a: 1 })).to.not.exist()
    expect(p1.find({ a: 1, q: 9 })).to.equal('Q')
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

    expect(p1.find({ a: 1 }).toString()).to.equal(['A', 'B'].toString())
    expect(p1.find({ b: 1 }).toString()).to.equal(['C'].toString())
    expect(p1.list().length).to.equal(2)

    p1.remove({ b: 1 })
    expect(p1.list().length).to.equal(1)
    expect(p1.find({ b: 1 })).to.not.exist()
    expect(p1.find({ a: 1 }).toString()).to.equal(['A', 'B'].toString())

    p1.remove({ a: 1 })
    expect(p1.list().length).to.equal(1)
    expect(p1.find({ b: 1 })).to.not.exist()

    expect(JSON.stringify(p1.find({ a: 1 })).toString()).to.equal('["A"]')

    p1.remove({ a: 1 })
    expect(p1.list().length).to.equal(0)
    expect(p1.find({ b: 1 })).to.not.exist()
    expect(p1.find({ a: 1 })).to.not.exist()
  })

  it('custom-gex', async () => {
    // this custom function matches glob expressions
    var p2 = Patrun(function (pat, data) {
      var gexers = {}
      Object.keys(pat).forEach(function (k) {
        var v = pat[k]
        if ('string' === typeof v && ~v.indexOf('*')) {
          delete pat[k]
          gexers[k] = Gex(v)
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

    expect(p2.find({ a: 1 })).to.equal('X')
    expect(p2.find({ a: 1, b: 'x' })).to.equal('X')

    p2.add({ a: 1, b: '*', c: 'q*z' }, 'Y')

    expect(p2.find({ a: 1 })).to.equal('X')
    expect(p2.find({ a: 1, b: 'x' })).to.equal('X')
    expect(p2.find({ a: 1, b: 'x', c: 'qaz' })).to.equal('Y')

    p2.add({ w: 1 }, 'W')
    expect(p2.find({ w: 1 })).to.equal('W')
    expect(p2.find({ w: 1, q: 'x' })).to.equal('W')

    p2.add({ w: 1, q: 'x*' }, 'Q')
    expect(p2.find({ w: 1 })).to.equal('W')
    expect(p2.find({ w: 1, q: 'x' })).to.equal('Q')
    expect(p2.find({ w: 1, q: 'y' })).to.equal('W')
  })

  it('find-exact', async () => {
    var p1 = Patrun()
    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1, b: 2 }, 'B')
    p1.add({ a: 1, b: 2, c: 3 }, 'C')

    expect(p1.find({ a: 1 })).to.equal('A')
    expect(p1.find({ a: 1 }, true)).to.equal('A')
    expect(p1.find({ a: 1, b: 8 })).to.equal('A')
    expect(p1.find({ a: 1, b: 8 }, true)).to.equal(null)
    expect(p1.find({ a: 1, b: 8, c: 3 })).to.equal('A')
    expect(p1.find({ a: 1, b: 8, c: 3 }, true)).to.equal(null)

    expect(p1.find({ a: 1, b: 2 })).to.equal('B')
    expect(p1.find({ a: 1, b: 2 }, true)).to.equal('B')
    expect(p1.find({ a: 1, b: 2, c: 9 })).to.equal('B')
    expect(p1.find({ a: 1, b: 2, c: 9 }, true)).to.equal(null)

    expect(p1.find({ a: 1, b: 2, c: 3 })).to.equal('C')
    expect(p1.find({ a: 1, b: 2, c: 3 }, true)).to.equal('C')
    expect(p1.find({ a: 1, b: 2, c: 3, d: 7 })).to.equal('C')
    expect(p1.find({ a: 1, b: 2, c: 3, d: 7 }, true)).to.equal(null)
  })

  it('list-any', async () => {
    var p1 = Patrun()
    p1.add({ a: 1 }, 'A')
    p1.add({ a: 1, b: 2 }, 'B')
    p1.add({ a: 1, b: 2, c: 3 }, 'C')

    var mA = '{"match":{"a":"1"},"data":"A"}'
    var mB = '{"match":{"a":"1","b":"2"},"data":"B"}'
    var mC = '{"match":{"a":"1","b":"2","c":"3"},"data":"C"}'

    expect(JSON.stringify(p1.list())).to.equal('[' + [mA, mB, mC] + ']')

    expect(JSON.stringify(p1.list({ a: 1 }))).to.equal('[' + [mA, mB, mC] + ']')
    expect(JSON.stringify(p1.list({ b: 2 }))).to.equal('[' + [mB, mC] + ']')
    expect(JSON.stringify(p1.list({ c: 3 }))).to.equal('[' + [mC] + ']')

    expect(JSON.stringify(p1.list({ a: '*' }))).to.equal(
      '[' + [mA, mB, mC] + ']'
    )
    expect(JSON.stringify(p1.list({ b: '*' }))).to.equal('[' + [mB, mC] + ']')
    expect(JSON.stringify(p1.list({ c: '*' }))).to.equal('[' + [mC] + ']')

    expect(JSON.stringify(p1.list({ a: 1, b: 2 }))).to.equal(
      '[' + [mB, mC] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, b: '*' }))).to.equal(
      '[' + [mB, mC] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, b: '*', c: 3 }))).to.equal(
      '[' + [mC] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, b: '*', c: '*' }))).to.equal(
      '[' + [mC] + ']'
    )

    expect(JSON.stringify(p1.list({ a: 1, c: '*' }))).to.equal('[' + [mC] + ']')

    // test star descent

    p1.add({ a: 1, d: 4 }, 'D')
    var mD = '{"match":{"a":"1","d":"4"},"data":"D"}'

    expect(JSON.stringify(p1.list())).to.equal('[' + [mA, mB, mC, mD] + ']')
    expect(JSON.stringify(p1.list({ a: 1 }))).to.equal(
      '[' + [mA, mB, mC, mD] + ']'
    )
    expect(JSON.stringify(p1.list({ d: 4 }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ a: 1, d: 4 }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ a: 1, d: '*' }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ d: '*' }))).to.equal('[' + [mD] + ']')

    p1.add({ a: 1, c: 33 }, 'CC')
    var mCC = '{"match":{"a":"1","c":"33"},"data":"CC"}'

    expect(JSON.stringify(p1.list())).to.equal(
      '[' + [mA, mB, mC, mCC, mD] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1 }))).to.equal(
      '[' + [mA, mB, mC, mCC, mD] + ']'
    )

    expect(JSON.stringify(p1.list({ d: 4 }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ a: 1, d: 4 }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ a: 1, d: '*' }))).to.equal('[' + [mD] + ']')
    expect(JSON.stringify(p1.list({ d: '*' }))).to.equal('[' + [mD] + ']')

    expect(JSON.stringify(p1.list({ c: 33 }))).to.equal('[' + [mCC] + ']')
    expect(JSON.stringify(p1.list({ a: 1, c: 33 }))).to.equal('[' + [mCC] + ']')
    expect(JSON.stringify(p1.list({ a: 1, c: '*' }))).to.equal(
      '[' + [mC, mCC] + ']'
    )
    expect(JSON.stringify(p1.list({ c: '*' }))).to.equal('[' + [mC, mCC] + ']')

    // exact
    expect(JSON.stringify(p1.list({ a: 1 }, true))).to.equal('[' + [mA] + ']')
    expect(JSON.stringify(p1.list({ a: '*' }, true))).to.equal('[' + [mA] + ']')
    expect(JSON.stringify(p1.list({ a: 1, b: 2 }, true))).to.equal(
      '[' + [mB] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, b: '*' }, true))).to.equal(
      '[' + [mB] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, c: 3 }, true))).to.equal('[]')
    expect(JSON.stringify(p1.list({ a: 1, c: 33 }, true))).to.equal(
      '[' + [mCC] + ']'
    )
    expect(JSON.stringify(p1.list({ a: 1, c: '*' }, true))).to.equal(
      '[' + [mCC] + ']'
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

    expect(p1.find({})).to.equal('Q!')
    expect(p1.find({ a: 1 })).to.equal('A!')
    expect(p1.find({ a: 1, b: 2 })).to.equal('B!')
    expect(p1.find({ a: 1, b: 2, c: 3 })).to.equal('C!')
  })

  it('mixed-values', async () => {
    var p1 = Patrun()

    p1.add({ a: 1 }, 'A')
    p1.add({ a: true }, 'AA')
    p1.add({ a: 0 }, 'AAA')
    p1.add({ a: 'A', b: 2 }, 'B')
    p1.add({ a: 'A', b: 'B', c: 3 }, 'C')

    expect(p1.find({ a: 1 })).to.equal('A')
    expect(p1.find({ a: true })).to.equal('AA')
    expect(p1.find({ a: 0 })).to.equal('AAA')
    expect(p1.find({ a: 'A', b: 2 })).to.equal('B')
    expect(p1.find({ a: 'A', b: 'B', c: 3 })).to.equal('C')

    expect(p1.list({ a: 1 }).length).to.equal(1)
    expect(p1.list({ a: true }).length).to.equal(1)
    expect(p1.list({ a: 0 }).length).to.equal(1)

    p1.add({}, 'Q')
    expect(p1.find({})).to.equal('Q')
  })

  it('no-props', async () => {
    var p1 = Patrun()
    p1.add({}, 'Z')
    expect(p1.find({})).to.equal('Z')

    p1.add({ a: 1 }, 'X')
    expect(p1.find({})).to.equal('Z')

    p1.add({ b: 2 }, 'Y')
    expect(p1.find({})).to.equal('Z')

    p1.remove({ b: 2 })
    expect(p1.find({})).to.equal('Z')
  })

  it('zero', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'X')
    expect(p1.find({ a: 0 })).to.equal('X')
  })

  it('multi-match', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ b: 1 }, 'Q')
    p1.add({ c: 2 }, 'R')

    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0, c: 2 })).to.equal('P')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('P')
    expect(p1.find({ a: 0, c: 2 })).to.equal('P')
    expect(p1.find({ b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ c: 2 })).to.equal('R')

    p1.add({ a: 0, b: 1 }, 'S')
    expect(p1.find({ a: 0, b: 1 })).to.equal('S')
    expect(p1.find({ a: 0, c: 2 })).to.equal('P')

    p1.add({ b: 1, c: 2 }, 'T')
    expect(p1.find({ a: 0, b: 1 })).to.equal('S')
    expect(p1.find({ a: 0, c: 2 })).to.equal('P')
    expect(p1.find({ b: 1, c: 2 })).to.equal('T')

    p1.add({ d: 3 }, 'U')
    expect(p1.find({ d: 3 })).to.equal('U')
    expect(p1.find({ a: 0, d: 3 })).to.equal('P')
    expect(p1.find({ b: 1, d: 3 })).to.equal('Q')
    expect(p1.find({ c: 2, d: 3 })).to.equal('R')

    p1.add({ c: 2, d: 3 }, 'V')
    expect(p1.find({ c: 2, d: 3 })).to.equal('V')
    expect(p1.find({ a: 0, b: 1 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, d: 3 })).to.equal('S')
  })

  it('partial-match', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ a: 0, b: 1, c: 2 }, 'Q')

    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')

    p1.add({ a: 0, d: 3 }, 'S')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')

    p1.add({ a: 0, b: 1, c: 2, e: 4, f: 5 }, 'T')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal('Q')

    p1.add({ a: 0, b: 1 }, 'M')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('M')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal('Q')

    p1.add({ a: 0, b: 1, c: 2, e: 4 }, 'N')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('M')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal('N')
  })

  it('partial-match-remove', async () => {
    var p1 = Patrun()
    p1.add({ a: 0 }, 'P')
    p1.add({ a: 0, b: 1, c: 2 }, 'Q')

    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')

    p1.add({ a: 0, d: 3 }, 'S')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')

    p1.add({ a: 0, b: 1, c: 2, e: 4, f: 5 }, 'T')
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal('P')
    expect(p1.find({ a: 0 })).to.equal('P')
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal('Q')

    p1.remove({ a: 0 })
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal('Q')
    expect(p1.find({ a: 0, b: 1 })).to.equal(null)
    expect(p1.find({ a: 0 })).to.equal(null)
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal('Q')

    p1.remove({ a: 0, b: 1, c: 2 })
    expect(p1.find({ a: 0, b: 1, c: 2 })).to.equal(null)
    expect(p1.find({ a: 0, b: 1 })).to.equal(null)
    expect(p1.find({ a: 0 })).to.equal(null)
    expect(p1.find({ a: 0, d: 3 })).to.equal('S')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4, f: 5 })).to.equal('T')
    expect(p1.find({ a: 0, b: 1, c: 2, e: 4 })).to.equal(null)
  })

  it('noConflict', async () => {
    var r = Patrun().noConflict()
    r.add({}, 'R')
    expect(r.toString(true)).to.equal(' <R>')
    expect(r.toString(false)).to.equal(' -> <R>')
  })

  it('add-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 'A' }, 'XA')
    expect(p1.find({ a: 'A' })).to.equal('XA')
    expect(p1.find({})).to.not.exist()

    p1.add({ b: '*' }, 'XB')
    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ b: 'B' })).to.equal('XB')
    expect(p1.find({ b: '0' })).to.equal('XB')
    expect(p1.find({ b: 2 })).to.equal('XB')
    expect(p1.find({ b: 1 })).to.equal('XB')
    expect(p1.find({ b: 0 })).to.equal('XB')
    expect(p1.find({ b: '' })).to.equal('XB') // this is correct
    expect(p1.find({})).to.not.exist()

    p1.add({ c: '*' }, 'XC')
    expect(p1.find({ c: 'A' })).to.equal('XC')
    expect(p1.find({ c: 'B' })).to.equal('XC')
    expect(p1.find({ c: '0' })).to.equal('XC')
    expect(p1.find({ c: 2 })).to.equal('XC')
    expect(p1.find({ c: 1 })).to.equal('XC')
    expect(p1.find({ c: 0 })).to.equal('XC')
    expect(p1.find({ c: '' })).to.equal('XC') // this is correct
    expect(p1.find({})).to.not.exist()

    expect(p1.find({ b: 'A', c: 'A' })).to.equal('XB')

    p1.add({ e: '*' }, 'XE')
    p1.add({ d: '*' }, 'XD')

    //console.log(require('util').inspect(p1.top,{depth:99}))

    // alphanumeric ordering
    expect(p1.find({ d: 'A', e: 'A' })).to.equal('XD')

    p1.add({ b: 0 }, 'XB0')
    //console.log(require('util').inspect(p1.top,{depth:99}))

    p1.add({ b: 'B' }, 'XBB')
    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ b: 0 })).to.equal('XB0')
    expect(p1.find({ b: 'B' })).to.equal('XBB')
  })

  it('add-mixed-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: '*' }, 'XAS')
    p1.add({ a: 'A' }, 'XA')

    p1.add({ b: 'A' }, 'XB')
    p1.add({ b: '*' }, 'XBS')

    expect(p1.find({ a: 'A' })).to.equal('XA')
    expect(p1.find({ a: 'Q' })).to.equal('XAS')

    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ b: 'Q' })).to.equal('XBS')

    p1.add({ c: 'B' }, 'XCB')
    p1.add({ c: 'A' }, 'XCA')
    p1.add({ c: '*b' }, 'XCBe')
    p1.add({ c: '*a' }, 'XCAe')
    p1.add({ c: 'b*' }, 'XCsB')
    p1.add({ c: 'a*' }, 'XCsA')

    expect(p1.find({ c: 'A' })).to.equal('XCA')
    expect(p1.find({ c: 'B' })).to.equal('XCB')
    expect(p1.find({ c: 'qb' })).to.equal('XCBe')
    expect(p1.find({ c: 'qa' })).to.equal('XCAe')
    expect(p1.find({ c: 'bq' })).to.equal('XCsB')
    expect(p1.find({ c: 'aq' })).to.equal('XCsA')

    expect(p1.find({ a: 'A' })).to.equal('XA')
    expect(p1.find({ a: 'Q' })).to.equal('XAS')
    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ b: 'Q' })).to.equal('XBS')
  })

  it('add-order-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ c: 'A' }, 'XC')
    p1.add({ c: '*' }, 'XCS')

    p1.add({ a: 'A' }, 'XA')
    p1.add({ a: '*' }, 'XAS')

    p1.add({ b: 'A' }, 'XB')
    p1.add({ b: '*' }, 'XBS')

    //console.log('\n'+require('util').inspect(p1.top,{depth:99}))
    //console.log(p1.toString(true))

    expect(p1.find({ c: 'A' })).to.equal('XC')
    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ a: 'A' })).to.equal('XA')

    expect(p1.find({ c: 'Q' })).to.equal('XCS')
    expect(p1.find({ b: 'Q' })).to.equal('XBS')
    expect(p1.find({ a: 'Q' })).to.equal('XAS')
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

    //console.log(p1.toString(true))

    expect(p1.find({ a: 1, b: 2 })).to.equal('Xa1b2')
    expect(p1.find({ a: 1, b: 0 })).to.equal('Xa1b*')
    expect(p1.find({ a: 1, c: 3 })).to.equal('Xa1c3')
    expect(p1.find({ a: 1, c: 0 })).to.equal('Xa1c*')
    expect(p1.find({ a: 1, b: 4, c: 5 })).to.equal('Xa1b4c5')
    expect(p1.find({ a: 1, b: 0, c: 5 })).to.equal('Xa1b*c5')
    expect(p1.find({ a: 1, b: 4, c: 0 })).to.equal('Xa1b4c*')
    expect(p1.find({ a: 1, b: 0, c: 0 })).to.equal('Xa1b*c*')
  })

  it('remove-gex', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 'A' }, 'XA')
    expect(p1.find({ a: 'A' })).to.equal('XA')
    expect(p1.find({})).to.not.exist()

    p1.add({ b: '*' }, 'XB')
    expect(p1.find({ b: 'A' })).to.equal('XB')
    expect(p1.find({ b: 'B' })).to.equal('XB')
    expect(p1.find({})).to.not.exist()
    expect(p1.find({ a: 'A' })).to.equal('XA')

    p1.remove({ b: '*' })
    expect(p1.find({ b: 'A' })).to.not.exist()
    expect(p1.find({ b: 'B' })).to.not.exist()
    expect(p1.find({})).to.not.exist()
    expect(p1.find({ a: 'A' })).to.equal('XA')
  })

  it('collect-once', async () => {
    var p1 = Patrun({ gex: true })
    p1.add({ d: 1, b: 1, a: 1 }, 'A')
    p1.add({ d: 1 }, 'B')
    expect(p1.find({ d: 1, b: 1 }, false, true)).equal(['B'])

    var p2 = Patrun({ gex: true })
    p2.add({ d: 1, b: 1, c: 1 }, 'A')
    p2.add({ d: 1 }, 'B')
    expect(p2.find({ d: 1, b: 1 }, false, true)).equal(['B'])

    var p3 = Patrun({ gex: true })
    p3.add({ d: 1, b: 1, e: 1 }, 'A')
    p3.add({ d: 1 }, 'B')
    expect(p3.find({ d: 1, b: 1 }, false, true)).equal(['B'])
  })

  it('collect-powerset', async () => {
    var p1 = Patrun({ gex: true })

    p1.add({ a: 1, b: 2 }, 'AB')
    p1.add({ a: 1, c: 3 }, 'AC')
    p1.add({ b: 2, c: 3 }, 'BC')
    p1.add({ a: 1, d: 4 }, 'AD')

    //console.log(''+p1)
    //console.log(p1.toString(true))

    expect(p1.find({ a: 1, b: 2, x: 1 }, false, true)).equal(['AB'])
    expect(p1.find({ a: 1, c: 3, x: 1 }, false, true)).equal(['AC'])
    expect(p1.find({ b: 2, c: 3, x: 1 }, false, true)).equal(['BC'])
    expect(p1.find({ a: 1, d: 4, x: 1 }, false, true)).equal(['AD'])

    expect(p1.find({ a: 1, b: 2, c: 3 }, false)).equal('AB')
    expect(p1.find({ a: 1, b: 2, c: 3 }, true)).equal(null)
    expect(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true)).equal([
      'AB',
      'AC',
      'BC',
    ])

    p1.add({ b: 1, e: 5 }, 'BE')
    expect(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true)).equal([
      'AB',
      'AC',
      'BC',
    ])

    p1.add({ a: 1, b: 2, c: 3 }, 'ABC')
    expect(p1.find({ a: 1, b: 2, c: 3, x: 2 }, false, true)).equal([
      'AB',
      'ABC',
      'AC',
      'BC',
    ])

    expect(p1.find({ a: 1, b: 2, d: 4, x: 2 }, false, true)).equal(['AB', 'AD'])
    expect(p1.find({ a: 1, b: 2, c: 3, d: 4, x: 2 }, false, true)).equal([
      'AB',
      'ABC',
      'AC',
      'AD',
      'BC',
    ])
  })
})
