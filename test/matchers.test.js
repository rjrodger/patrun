/* Copyright (c) 2020 Richard Rodger and other contributors, MIT License */
'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')

const Jsonic = require('jsonic')

const Matchers = require('../dist/lib/matchers')

describe('matchers', function () {
  it('gex-basic', async () => {
    var gm = new Matchers.GexMatcher()

    assert.equal(gm.make('k', 1), undefined)
    assert.equal(gm.make('k', 'a'), undefined)

    var gm0 = gm.make('key', '*a')
    var gm0m = gm0.match
    assert.equal(gm0m('a'), true)
    assert.equal(gm0m('ab'), false)
    assert.equal(gm0m('ba'), true)

    var gmas = gm.make('k', 'a*')
    var gmbs = gm.make('k', 'b*')
    var scanResult = gm.scan([gmas, gmbs])
    assert.equal(scanResult.complete, false)
    assert.equal(scanResult.sound, false)

    // trivially complete and sound if we have a '*' match value
    var gms = gm.make('k', '*')
    var scanResult2 = gm.scan([gmas, gmbs, gms])
    assert.equal(scanResult2.complete, true)
    assert.equal(scanResult2.sound, true)

    assert.equal(gmas.same(gmbs), false)
    assert.equal(gmas.same(null), false)
    assert.equal(gm0.same(gmas), false)

    assert.equal(gm.make('k', 'a*').same(gmas), true)

    var im = new Matchers.IntervalMatcher()
    assert.equal(gmas.same(im.make('k', '>1')), false)
  })

  it('interval-basic', async () => {
    var im = new Matchers.IntervalMatcher()

    assert.equal(im.make('k', 1), undefined)
    assert.equal(im.make('k', 'a'), undefined)

    var im0 = im.make('key', '>10')
    var im0m = im0.match
    assert.equal(im0m(11), true)
    assert.equal(im0m(9), false)
    assert.equal(im0m(10), false)

    var im1 = im.make('key', '<=10')
    var im1m = im1.match
    assert.equal(im1m(11), false)
    assert.equal(im1m(9), true)
    assert.equal(im1m(10), true)

    var im2 = im.make('key', '>10 & <20')
    var im2m = im2.match
    assert.equal(im2m(11), true)
    assert.equal(im2m(9), false)
    assert.equal(im2m(10), false)
    assert.equal(im2m(19), true)
    assert.equal(im2m(20), false)
    assert.equal(im2m(21), false)

    var im3 = im.make('key', '<=10 || >=20')
    var im3m = im3.match
    assert.equal(im3m(11), false)
    assert.equal(im3m(9), true)
    assert.equal(im3m(10), true)
    assert.equal(im3m(19), false)
    assert.equal(im3m(20), true)
    assert.equal(im3m(21), true)
  })

  it('interval-make', async () => {
    // operator parsing is lenient
    var normop = Matchers.IntervalMatcher.normop
    assert.equal(normop('='), '=')
    assert.equal(normop('=='), '=')
    assert.equal(normop('==='), '=')
    assert.equal(normop('<='), '<=')
    assert.equal(normop('>='), '>=')
    assert.equal(normop('=='), '=')
    assert.equal(normop('<=='), '<=')
    assert.equal(normop('>=='), '>=')
    assert.equal(normop('=<'), '<=')
    assert.equal(normop('=>'), '>=')
    assert.equal(normop('==<'), '<=')
    assert.equal(normop('==>'), '>=')
    assert.equal(normop('('), '(')
    assert.equal(normop('['), '[')
    assert.equal(normop(')'), ')')
    assert.equal(normop(']'), ']')

    var im = new Matchers.IntervalMatcher()
    var gm = new Matchers.GexMatcher()

    assert.equal(im.make('k', '<=10').same(im.make('k', '<=10')), true)
    assert.equal(im.make('k', '<=10').same(im.make('k', '<=11')), false)
    assert.equal(im.make('k', '<=10').same(im.make('k', '<10')), false)
    assert.equal(im.make('k', '<=10').same(null), false)
    assert.equal(im.make('k', '<=10').same(gm.make('k', '*')), false)
    assert.equal(im.make('k', '<10&>20').same(im.make('k', '<10&>20')), true)
    assert.equal(im.make('k', '(10,20)').same(im.make('k', '>10&<20')), true)
    assert.equal(im.make('k', '[10,20]').same(im.make('k', '=>10, <=20')), true)
    assert.equal(im.make('k', '<10&>20').same(im.make('k', '<10|>20')), false)
    assert.equal(im.make('k', '<10&>20').same(im.make('k', '<10&>30')), false)
    assert.equal(im.make('k', '<10&>20').same(im.make('k', '<0&>20')), false)
    assert.equal(im.make('k', '<=10&>20').same(im.make('k', '<10&>20')), false)

    // Full format tests
    var m1 = im.make('k', '<=10').meta
    assert.equal(m1.jo, 'and')
    assert.equal(m1.o0, 'gte')
    assert.equal(m1.n0, -Infinity)
    assert.equal(m1.o1, 'lte')
    assert.equal(m1.n1, 10)

    var m2 = im.make('k', '=10').meta
    assert.equal(m2.jo, 'or')
    assert.equal(m2.o0, 'eq')
    assert.equal(m2.n0, 10)
    assert.equal(m2.o1, 'nil')
    assert.ok(isNaN(m2.n1))

    var m3 = im.make('k', '<10').meta
    assert.equal(m3.jo, 'and')
    assert.equal(m3.o0, 'gte')
    assert.equal(m3.n0, -Infinity)
    assert.equal(m3.o1, 'lt')
    assert.equal(m3.n1, 10)

    var m4 = im.make('k', '>10').meta
    assert.equal(m4.jo, 'and')
    assert.equal(m4.o0, 'gt')
    assert.equal(m4.n0, 10)
    assert.equal(m4.o1, 'lte')
    assert.equal(m4.n1, Infinity)

    var m5 = im.make('k', '>=10').meta
    assert.equal(m5.jo, 'and')
    assert.equal(m5.o0, 'gte')
    assert.equal(m5.n0, 10)
    assert.equal(m5.o1, 'lte')
    assert.equal(m5.n1, Infinity)

    // Utility abbreviations for tests
    var nm = { gte: '>=', gt: '>', eq: '=', lt: '<', lte: '<=', nil: '@' }
    var dm = (m) =>
      m
        ? nm[m.o0] + ' ' + m.n0 + ' ' + m.jo + ' ' + nm[m.o1] + ' ' + m.n1
        : void 0
    var tm = (s) => dm((im.make('k', s) || {}).meta)

    assert.equal(tm('<=10'), '>= -Infinity and <= 10')
    assert.equal(tm('<10'), '>= -Infinity and < 10')
    assert.equal(tm('=10'), '= 10 or @ NaN')
    assert.equal(tm('>10'), '> 10 and <= Infinity')
    assert.equal(tm('>=10'), '>= 10 and <= Infinity')

    var m6 = im.make('k', '=10').meta
    assert.equal(m6.jo, 'or')
    assert.equal(m6.o0, 'eq')
    assert.equal(m6.n0, 10)
    assert.equal(m6.o1, 'nil')
    assert.ok(isNaN(m6.n1))

    var m7 = im.make('k', '==10').meta
    assert.equal(m7.jo, 'or')
    assert.equal(m7.o0, 'eq')
    assert.equal(m7.n0, 10)
    assert.equal(m7.o1, 'nil')
    assert.ok(isNaN(m7.n1))

    var m8 = im.make('k', '===10').meta
    assert.equal(m8.jo, 'or')
    assert.equal(m8.o0, 'eq')
    assert.equal(m8.n0, 10)
    assert.equal(m8.o1, 'nil')
    assert.ok(isNaN(m8.n1))

    var m9 = im.make('k', '=<10').meta
    assert.equal(m9.jo, 'and')
    assert.equal(m9.o0, 'gte')
    assert.equal(m9.n0, -Infinity)
    assert.equal(m9.o1, 'lte')
    assert.equal(m9.n1, 10)

    var m10 = im.make('k', '=>10').meta
    assert.equal(m10.jo, 'and')
    assert.equal(m10.o0, 'gte')
    assert.equal(m10.n0, 10)
    assert.equal(m10.o1, 'lte')
    assert.equal(m10.n1, Infinity)

    // no operators
    assert.equal(im.make('k', 'x10'), undefined)

    // invalid syntax
    assert.equal(im.make('k', '><'), undefined)

    // standalone numbers not supported
    assert.equal(im.make('k', '10'), undefined)

    var m11 = im.make('k', '[10').meta
    assert.equal(m11.jo, 'and')
    assert.equal(m11.o0, 'gte')
    assert.equal(m11.n0, 10)
    assert.equal(m11.o1, 'lte')
    assert.equal(m11.n1, Infinity)

    var m12 = im.make('k', '(10').meta
    assert.equal(m12.jo, 'and')
    assert.equal(m12.o0, 'gt')
    assert.equal(m12.n0, 10)
    assert.equal(m12.o1, 'lte')
    assert.equal(m12.n1, Infinity)

    var m13 = im.make('k', '[10,20]').meta
    assert.equal(m13.jo, 'and')
    assert.equal(m13.o0, 'gte')
    assert.equal(m13.n0, 10)
    assert.equal(m13.o1, 'lte')
    assert.equal(m13.n1, 20)

    var m14 = im.make('k', '(10,20)').meta
    assert.equal(m14.jo, 'and')
    assert.equal(m14.o0, 'gt')
    assert.equal(m14.n0, 10)
    assert.equal(m14.o1, 'lt')
    assert.equal(m14.n1, 20)

    var m15 = im.make('k', '(10, 20] ').meta
    assert.equal(m15.jo, 'and')
    assert.equal(m15.o0, 'gt')
    assert.equal(m15.n0, 10)
    assert.equal(m15.o1, 'lte')
    assert.equal(m15.n1, 20)

    var m16 = im.make('k', ' [ 10, 20 ) ').meta
    assert.equal(m16.jo, 'and')
    assert.equal(m16.o0, 'gte')
    assert.equal(m16.n0, 10)
    assert.equal(m16.o1, 'lt')
    assert.equal(m16.n1, 20)

    var m17 = im.make('k', '10..20').meta
    assert.equal(m17.jo, 'and')
    assert.equal(m17.o0, 'gte')
    assert.equal(m17.n0, 10)
    assert.equal(m17.o1, 'lte')
    assert.equal(m17.n1, 20)

    var m18 = im.make('k', '(10..20').meta
    assert.equal(m18.jo, 'and')
    assert.equal(m18.o0, 'gt')
    assert.equal(m18.n0, 10)
    assert.equal(m18.o1, 'lte')
    assert.equal(m18.n1, 20)

    var m19 = im.make('k', '10..20)').meta
    assert.equal(m19.jo, 'and')
    assert.equal(m19.o0, 'gte')
    assert.equal(m19.n0, 10)
    assert.equal(m19.o1, 'lt')
    assert.equal(m19.n1, 20)

    // no operators
    assert.equal(im.make('k', '10x20'), undefined)

    var m20 = im.make('k', '<20&>10').meta
    assert.equal(m20.jo, 'and')
    assert.equal(m20.o0, 'gt')
    assert.equal(m20.n0, 10)
    assert.equal(m20.o1, 'lt')
    assert.equal(m20.n1, 20)

    var m21 = im.make('k', '20..10').meta
    assert.equal(m21.jo, 'and')
    assert.equal(m21.o0, 'gte')
    assert.equal(m21.n0, 10)
    assert.equal(m21.o1, 'lte')
    assert.equal(m21.n1, 20)

    var m22 = im.make('k', '<10&=10').meta
    assert.equal(m22.jo, 'and')
    assert.equal(m22.o0, 'gte')
    assert.equal(m22.n0, -Infinity)
    assert.equal(m22.o1, 'lte')
    assert.equal(m22.n1, 10)

    var m23 = im.make('k', '>10&=10').meta
    assert.equal(m23.jo, 'and')
    assert.equal(m23.o0, 'gte')
    assert.equal(m23.n0, 10)
    assert.equal(m23.o1, 'lte')
    assert.equal(m23.n1, Infinity)

    var m24 = im.make('k', '=10&<10').meta
    assert.equal(m24.jo, 'and')
    assert.equal(m24.o0, 'gte')
    assert.equal(m24.n0, -Infinity)
    assert.equal(m24.o1, 'lte')
    assert.equal(m24.n1, 10)

    var m25 = im.make('k', '=10&>10').meta
    assert.equal(m25.jo, 'and')
    assert.equal(m25.o0, 'gte')
    assert.equal(m25.n0, 10)
    assert.equal(m25.o1, 'lte')
    assert.equal(m25.n1, Infinity)

    var m26 = im.make('k', '=10&=10').meta
    assert.equal(m26.jo, 'and')
    assert.equal(m26.o0, 'eq')
    assert.equal(m26.n0, 10)
    assert.equal(m26.o1, 'nil')
    assert.ok(isNaN(m26.n1))

    var m27 = im.make('k', '[10&=10').meta
    assert.equal(m27.jo, 'and')
    assert.equal(m27.o0, 'err')
    assert.equal(m27.n0, 10)
    assert.equal(m27.o1, 'nil')
    assert.ok(isNaN(m27.n1))

    var m28 = im.make('k', '=10&10]').meta
    assert.equal(m28.jo, 'and')
    assert.equal(m28.o0, 'err')
    assert.equal(m28.n0, 10)
    assert.equal(m28.o1, 'nil')
    assert.ok(isNaN(m28.n1))

    var m29 = im.make('k', '<10&>10').meta
    assert.equal(m29.jo, 'and')
    assert.equal(m29.o0, 'lt')
    assert.equal(m29.n0, 10)
    assert.equal(m29.o1, 'gt')
    assert.equal(m29.n1, 10)

    var m30 = im.make('k', '<=10&>=10').meta
    assert.equal(m30.jo, 'and')
    assert.equal(m30.o0, 'lte')
    assert.equal(m30.n0, 10)
    assert.equal(m30.o1, 'gte')
    assert.equal(m30.n1, 10)

    assert.equal(tm('>= 0xA & >= 0xB'), '>= 10 and >= 11')
    assert.equal(tm('>= 0xA & x 0xB'), void 0)
  })

  it('interval-half', async () => {
    var im = new Matchers.IntervalMatcher()
    let rc = (x) => im.scan(x.map((i) => im.make('k', i)))
    var hi = im.half_intervals

    var jm = (s) => ({ meta: Jsonic(s[0]) })
    var j = (s) => ({ ...Jsonic(s[0]) })

    assert.deepStrictEqual(hi([]), [])
    assert.deepStrictEqual(hi([{ meta: {} }]), [])

    assert.deepStrictEqual(hi([jm`n0:1,o0:eq`]), [j`n:1,o:eq`])
    assert.deepStrictEqual(hi([jm`n0:1,o0:lt`]), [j`n:1,o:lt`])
    assert.deepStrictEqual(hi([jm`n0:1,o0:lte`]), [j`n:1,o:lte`])
    assert.deepStrictEqual(hi([jm`n0:1,o0:gt`]), [j`n:1,o:gt`])
    assert.deepStrictEqual(hi([jm`n0:1,o0:gte`]), [j`n:1,o:gte`])

    assert.deepStrictEqual(hi([jm`n0:1,o0:gte,n1:2,o1:lt`]), [j`n:1,o:gte`, j`n:2,o:lt`])
    assert.deepStrictEqual(hi([jm`n0:1,o0:gt,n1:2,o1:lt`]), [j`n:1,o:gt`, j`n:2,o:lt`])

    assert.deepStrictEqual(hi([jm`n0:2,o0:gt,n1:3,o1:lt`, jm`n0:1,o0:gt,n1:3,o1:lt`]), [
      j`n:1,o:gt`,
      j`n:3,o:lt`,
      j`n:2,o:gt`,
      j`n:3,o:lt`,
    ])

    assert.deepStrictEqual(
      hi([
        jm`n0:3,o0:gt,n1:4,o1:lt`,
        jm`n0:1,o0:gt,n1:2,o1:lt`,
        jm`n0:5,o0:gt,n1:6,o1:lt`,
      ]),
      [
        j`n:1,o:gt`,
        j`n:2,o:lt`,
        j`n:3,o:gt`,
        j`n:4,o:lt`,
        j`n:5,o:gt`,
        j`n:6,o:lt`,
      ],
    )

    // lt < lte
    assert.deepStrictEqual(
      hi([
        jm`n0:1,o0:gt,n1:2,o1:lt`,
        jm`n0:1,o0:gt,n1:2,o1:lte`,
        jm`n0:3,o0:gt,n1:4,o1:lte`,
        jm`n0:3,o0:gt,n1:4,o1:lt`,
      ]),
      [
        j`n:1,o:gt`,
        j`n:2,o:lt`,
        j`n:1,o:gt`,
        j`n:2,o:lte`,
        j`n:3,o:gt`,
        j`n:4,o:lt`,
        j`n:3,o:gt`,
        j`n:4,o:lte`,
      ],
    )

    var overs = [
      [
        { n: 1, o: 'gt', m: 10 },
        { n: 2, o: 'lt', m: 11 },
      ],
    ]
    assert.deepStrictEqual(rc(['>1&<2', '>1&<=2']).overs, overs)
    assert.deepStrictEqual(rc(['>1&<=2', '>1&<2']).overs, overs)

    // gte < gt
    assert.deepStrictEqual(
      hi([
        jm`n0:1,o0:gt,n1:2,o1:lt`,
        jm`n0:1,o0:gte,n1:2,o1:lt`,
        jm`n0:3,o0:gte,n1:4,o1:lt`,
        jm`n0:3,o0:gt,n1:4,o1:lt`,
      ]),
      [
        j`n:1,o:gte`,
        j`n:2,o:lt`,
        j`n:1,o:gt`,
        j`n:2,o:lt`,
        j`n:3,o:gte`,
        j`n:4,o:lt`,
        j`n:3,o:gt`,
        j`n:4,o:lt`,
      ],
    )

    // sort numerically
    assert.deepStrictEqual(
      hi([
        jm`n0:3,o0:gt,n1:4.5,o1:lt`,
        jm`n0:3,o0:gt,n1:4,o1:lte`,
        jm`n0:1,o0:gt,n1:2,o1:lt`,
        jm`n0:1,o0:gt,n1:2,o1:lte`,
        jm`n0:5,o0:gt,n1:6,o1:lt`,
        jm`n0:7,o0:gte,n1:8,o1:lt`,
        jm`n0:7,o0:gt,n1:8,o1:lt`,
        jm`n0:5,o0:gte,n1:6,o1:lt`,
      ]),
      [
        j`n:1,o:gt`,
        j`n:2,o:lt`,
        j`n:1,o:gt`,
        j`n:2,o:lte`,
        j`n:3,o:gt`,
        j`n:4,o:lte`,
        j`n:3,o:gt`,
        j`n:4.5,o:lt`,
        j`n:5,o:gte`,
        j`n:6,o:lt`,
        j`n:5,o:gt`,
        j`n:6,o:lt`,
        j`n:7,o:gte`,
        j`n:8,o:lt`,
        j`n:7,o:gt`,
        j`n:8,o:lt`,
      ],
    )

    // second term operationally
    assert.deepStrictEqual(hi([jm`n0:1,o0:gt,n1:2,o1:lte`, jm`n0:1,o0:gt,n1:2,o1:lt`]), [
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lte`,
    ])

    // actually equal
    assert.deepStrictEqual(hi([jm`n0:1,o0:gt,n1:2,o1:lt`, jm`n0:1,o0:gt,n1:2,o1:lt`]), [
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lt`,
    ])

    // two overs here!
    assert.deepStrictEqual(rc(['>1&<2', '>1&<2', '>1&<2']).overs, [
      [
        { n: 1, o: 'gt', m: 10 },
        { n: 2, o: 'lt', m: 11 },
      ],
      [
        { n: 1, o: 'gt', m: 10 },
        { n: 2, o: 'lt', m: 11 },
      ],
    ])
  })

  it('interval-completion', async () => {
    var im = new Matchers.IntervalMatcher()

    // With no gaps => complete

    var is0 = ['>=10&<=20', '>20', '<10'].map((i) => im.make('k', i))
    assert.deepStrictEqual(is0.map((x) => ({ k: x.kind, m: x.meta })), [
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 10,
          n1: 20,
          o0: 'gte',
          o1: 'lte',
        },
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 20,
          n1: Infinity,
          o0: 'gt',
          o1: 'lte',
        },
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: -Infinity,
          n1: 10,
          o0: 'gte',
          o1: 'lt',
        },
      },
    ])

    var is0s = im.half_intervals(is0)
    assert.deepStrictEqual(is0s, [
      { n: -Infinity, o: 'gte' },
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 20, o: 'lte' },
      { n: 20, o: 'gt' },
      { n: Infinity, o: 'lte' },
    ])

    var is0c = im.scan(is0)
    assert.equal(is0c.complete, true)
    assert.deepStrictEqual(is0c.gaps, [])

    // With gaps

    var is1 = ['>=10&<=15', '>20', '<10'].map((i) => im.make('k', i))
    assert.deepStrictEqual(is1.map((x) => ({ k: x.kind, m: x.meta })), [
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 10,
          n1: 15,
          o0: 'gte',
          o1: 'lte',
        },
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 20,
          n1: Infinity,
          o0: 'gt',
          o1: 'lte',
        },
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n1: 10,
          n0: -Infinity,
          o1: 'lt',
          o0: 'gte',
        },
      },
    ])

    var is1s = im.half_intervals(is1)
    assert.deepStrictEqual(is1s, [
      { n: -Infinity, o: 'gte' },
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 15, o: 'lte' },
      { n: 20, o: 'gt' },
      { n: Infinity, o: 'lte' },
    ])

    var is1c = im.scan(is1)
    assert.equal(is1c.complete, false)
    assert.deepStrictEqual(is1c.gaps, [
      [
        { n: 15, o: 'gt', m: 4 },
        { n: 20, o: 'lte', m: 5 },
      ],
    ])

    let rc = (x) => im.scan(x.map((i) => im.make('k', i)))

    var r1 = rc(['<10'])
    assert.equal(r1.complete, false)
    assert.deepStrictEqual(r1.gaps, [
      [
        { n: 10, o: 'gte', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r2 = rc(['10)'])
    assert.equal(r2.complete, false)
    assert.deepStrictEqual(r2.gaps, [
      [
        { n: 10, o: 'gte', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r3 = rc(['<=10'])
    assert.equal(r3.complete, false)
    assert.deepStrictEqual(r3.gaps, [
      [
        { n: 10, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r4 = rc(['10]'])
    assert.equal(r4.complete, false)
    assert.deepStrictEqual(r4.gaps, [
      [
        { n: 10, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r5 = rc(['>=10'])
    assert.equal(r5.complete, false)
    assert.deepStrictEqual(r5.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lt', m: 0 },
      ],
    ])

    var r6 = rc(['[10'])
    assert.equal(r6.complete, false)
    assert.deepStrictEqual(r6.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lt', m: 0 },
      ],
    ])

    var r7 = rc(['>10'])
    assert.equal(r7.complete, false)
    assert.deepStrictEqual(r7.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lte', m: 0 },
      ],
    ])

    var r8 = rc(['(10'])
    assert.equal(r8.complete, false)
    assert.deepStrictEqual(r8.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lte', m: 0 },
      ],
    ])

    var r9 = rc(['=10'])
    assert.equal(r9.complete, false)
    assert.deepStrictEqual(r9.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lte', m: 1 },
      ],
      [
        { n: 10, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r10 = rc(['10..20'])
    assert.equal(r10.complete, false)
    assert.deepStrictEqual(r10.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lt', m: 0 },
      ],
      [
        { n: 20, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r11 = rc(['10.5..20.5'])
    assert.equal(r11.complete, false)
    assert.deepStrictEqual(r11.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10.5, o: 'lt', m: 0 },
      ],
      [
        { n: 20.5, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r12 = rc(['[1.05e1,205e-1]'])
    assert.equal(r12.complete, false)
    assert.deepStrictEqual(r12.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10.5, o: 'lt', m: 0 },
      ],
      [
        { n: 20.5, o: 'gt', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])

    var r13 = rc(['<10&=10', '=20&>20'])
    assert.equal(r13.complete, false)
    assert.deepStrictEqual(r13.gaps, [
      [
        { n: 10, o: 'gt', m: 4 },
        { n: 20, o: 'lt', m: 5 },
      ],
    ])
    assert.deepStrictEqual(r13.overs, [])
  })

  it('interval-overlaps', async () => {
    var im = new Matchers.IntervalMatcher()
    let rc = (x) => im.scan(x.map((i) => im.make('k', i)))

    var is0 = ['<=10', '<20', '>10', '>=20'].map((i) => im.make('k', i))

    var is0c = im.scan(is0)

    assert.equal(is0c.complete, true)
    assert.deepStrictEqual(is0c.gaps, [])
    assert.deepStrictEqual(is0c.overs, [
      [
        { n: -Infinity, o: 'gte', m: 10 },
        { n: 10, o: 'lte', m: 11 },
      ],
      [
        { n: 10, o: 'gt', m: 10 },
        { n: 20, o: 'lt', m: 11 },
      ],
      [
        { n: 20, o: 'gte', m: 10 },
        { n: Infinity, o: 'lte', m: 11 },
      ],
    ])

    // With gaps

    var is1 = ['<20', '>10'].map((i) => im.make('k', i))

    var is1c = im.scan(is1)

    assert.equal(is1c.complete, true)
    assert.deepStrictEqual(is1c.gaps, [])
    assert.deepStrictEqual(is1c.overs, [
      [
        { n: 10, o: 'gt', m: 10 },
        { n: 20, o: 'lt', m: 11 },
      ],
    ])

    // same direction

    var is2 = ['>20', '>10'].map((i) => im.make('k', i))

    var is2c = im.scan(is2)

    assert.equal(is2c.complete, false)
    assert.deepStrictEqual(is2c.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lte', m: 0 },
      ],
    ])
    assert.deepStrictEqual(is2c.overs, [
      [
        { n: 20, o: 'gt', m: 10 },
        { n: Infinity, o: 'lte', m: 11 },
      ],
    ])

    var is3 = ['>10', '>20', '>30'].map((i) => im.make('k', i))

    var is3c = im.scan(is3)

    assert.equal(is3c.complete, false)
    assert.deepStrictEqual(is3c.gaps, [
      [
        { n: -Infinity, o: 'gte' },
        { n: 10, o: 'lte', m: 0 },
      ],
    ])
    assert.deepStrictEqual(is3c.overs, [
      [
        { n: 20, o: 'gt', m: 10 },
        { n: Infinity, o: 'lte', m: 11 },
      ],
      [
        { n: 30, o: 'gt', m: 10 },
        { n: Infinity, o: 'lte', m: 11 },
      ],
    ])

    var r1 = rc(['<10', '<20', '<30'])
    assert.equal(r1.complete, false)
    assert.deepStrictEqual(r1.gaps, [
      [
        { n: 30, o: 'gte', m: 6 },
        { n: Infinity, o: 'lte', m: 7 },
      ],
    ])
    assert.deepStrictEqual(r1.overs, [
      [
        { n: -Infinity, o: 'gte', m: 10 },
        { n: 10, o: 'lt', m: 11 },
      ],
      [
        { n: -Infinity, o: 'gte', m: 10 },
        { n: 20, o: 'lt', m: 11 },
      ],
    ])

    var r2 = rc(['<10', '[10,20]', '[15,25]', '>25'])
    assert.equal(r2.complete, true)
    assert.deepStrictEqual(r2.gaps, [])
    assert.deepStrictEqual(r2.overs, [
      [
        { n: 15, o: 'gte', m: 10 },
        { n: 20, o: 'lte', m: 11 },
      ],
    ])

    var r3 = rc(['<=20', '>=10'])
    assert.equal(r3.complete, true)
    assert.deepStrictEqual(r3.gaps, [])
    assert.deepStrictEqual(r3.overs, [
      [
        { n: 10, o: 'gte', m: 10 },
        { n: 20, o: 'lte', m: 11 },
      ],
    ])

    var r4 = rc(['<20&=20', '=10&>10'])
    assert.equal(r4.complete, true)
    assert.deepStrictEqual(r4.gaps, [])
    assert.deepStrictEqual(r4.overs, [
      [
        { n: 10, o: 'gte', m: 10 },
        { n: 20, o: 'lte', m: 11 },
      ],
    ])
  })
})
