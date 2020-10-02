/* Copyright (c) 2020 Richard Rodger and other contributors, MIT License */
'use strict'

var Lab = require('@hapi/lab')
Lab = null != Lab.script ? Lab : require('hapi-lab-shim')

var Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Matchers = require('../lib/matchers')


describe('matchers', function () {
  it('gex', async () => {
    var gm = new Matchers.GexMatcher()

    var gm0 = gm.make('key','*a')
    var gm0m = gm0.match
    expect(gm0m('a')).true()
    expect(gm0m('ab')).false()
    expect(gm0m('ba')).true()
    
  })

  it('interval-basic', async () => {
    var im = new Matchers.IntervalMatcher()

    var im0 = im.make('key','>10')
    var im0m = im0.match
    expect(im0m(11)).true()
    expect(im0m(9)).false()
    expect(im0m(10)).false()


    var im1 = im.make('key','<=10')
    var im1m = im1.match
    expect(im1m(11)).false()
    expect(im1m(9)).true()
    expect(im1m(10)).true()


    var im2 = im.make('key','>10 & <20')
    var im2m = im2.match
    expect(im2m(11)).true()
    expect(im2m(9)).false()
    expect(im2m(10)).false()
    expect(im2m(19)).true()
    expect(im2m(20)).false()
    expect(im2m(21)).false()

    
    var im3 = im.make('key','<=10 || >=20')
    var im3m = im3.match
    expect(im3m(11)).false()
    expect(im3m(9)).true()
    expect(im3m(10)).true()
    expect(im3m(19)).false()
    expect(im3m(20)).true()
    expect(im3m(21)).true()
  })


  it('interval-make', async () => {

    // operator parsing is lenient
    var normop = Matchers.IntervalMatcher.normop
    expect(normop('=')).equal('=')
    expect(normop('==')).equal('=')
    expect(normop('===')).equal('=')
    expect(normop('<=')).equal('<=')
    expect(normop('>=')).equal('>=')
    expect(normop('==')).equal('=')
    expect(normop('<==')).equal('<=')
    expect(normop('>==')).equal('>=')
    expect(normop('=<')).equal('<=')
    expect(normop('=>')).equal('>=')
    expect(normop('==<')).equal('<=')
    expect(normop('==>')).equal('>=')
    expect(normop('(')).equal('(')
    expect(normop('[')).equal('[')
    expect(normop(')')).equal(')')
    expect(normop(']')).equal(']')

    var im = new Matchers.IntervalMatcher()

    expect(im.make('k','<=10').meta)
      .contains({ jo: 'or', o0: 'lte', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','=10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','<10').meta)
      .contains({ jo: 'or', o0: 'lt', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','>10').meta)
      .contains({ jo: 'or', o0: 'gt', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','>=10').meta)
      .contains({ jo: 'or', o0: 'gte', n0: 10, o1: 'nil', n1: NaN })

    expect(im.make('k','10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','==10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','===10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    
    expect(im.make('k','=<10').meta)
      .contains({ jo: 'or', o0: 'lte', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','=>10').meta)
      .contains({ jo: 'or', o0: 'gte', n0: 10, o1: 'nil', n1: NaN })

    expect(im.make('k','x10').meta)
      .contains({ jo: 'or', o0: 'err' })

    expect(im.make('k','[10').meta)
      .contains({ jo: 'or', o0: 'gte', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','(10').meta)
      .contains({ jo: 'or', o0: 'gt', n0: 10, o1: 'nil', n1: NaN })

    expect(im.make('k','[10,20]').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: 20 })
    expect(im.make('k','(10,20)').meta)
      .contains({ jo: 'and', o0: 'gt', n0: 10, o1: 'lt', n1: 20 })
    expect(im.make('k','(10, 20] ').meta)
      .contains({ jo: 'and', o0: 'gt', n0: 10, o1: 'lte', n1: 20 })
    expect(im.make('k',' [ 10, 20 ) ').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lt', n1: 20 })

    expect(im.make('k','10..20').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: 20 })
    expect(im.make('k','10x20').meta)
      .contains({ jo: 'or', o0: 'err', n0: NaN, o1: 'nil', n1: NaN })

  })
  
  it('interval-completion', async () => {
    var im = new Matchers.IntervalMatcher()

    // With no gaps => complete
    
    var is0 = ['>=10&<=20','>20','<10'].map(i=>im.make('k',i))
    // console.log(is0)
    expect(is0.map(x=>({k:x.kind,m:x.meta}))).equals([
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 10,
          n1: 20,
          o0: 'gte',
          o1: 'lte'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'or',
          n0: 20,
          n1: NaN,
          o0: 'gt',
          o1: 'nil'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'or',
          n0: 10,
          n1: NaN,
          o0: 'lt',
          o1: 'nil'
        }
      }
    ])
    
    var is0s = im.half_intervals(is0)
    // console.log(is0s)
    expect(is0s).equals([
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 20, o: 'lte' },
      { n: 20, o: 'gt' }
    ])
    
    var is0c = im.complete(is0)
    //console.dir(is0c,{depth:null})
    expect(is0c).contains({
      ok: true,
      gaps: []
    })


    // With gaps
    
    var is1 = ['>=10&<=15','>20','<10','<30'].map(i=>im.make('k',i))
    // console.log(is1)
    expect(is1.map(x=>({k:x.kind,m:x.meta}))).equals([
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: 10,
          n1: 15,
          o0: 'gte',
          o1: 'lte'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'or',
          n0: 20,
          n1: NaN,
          o0: 'gt',
          o1: 'nil'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'or',
          n0: 10,
          n1: NaN,
          o0: 'lt',
          o1: 'nil'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'or',
          n0: 30,
          n1: NaN,
          o0: 'lt',
          o1: 'nil'
        }
      }
    ])
    
    var is1s = im.half_intervals(is1)
    //console.log(is1s)
    expect(is1s).equals([
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 15, o: 'lte' },
      { n: 20, o: 'gt' },
      { n: 30, o: 'lt' }
    ])
    
    var is1c = im.complete(is1)
    // console.dir(is1c,{depth:null})
    expect(is1c).contains({
      ok: false,
      gaps: [
        [ { n: 15, o: 'gt', m: 4 }, { n: 20, o: 'lte', m: 5 } ],
        [ { n: 30, o: 'gte', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ]
    })


    let rc = (x)=>im.complete(x.map(i=>im.make('k',i)))

    expect(rc(['<10'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gte', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ]
    })

    expect(rc(['<=10'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ],
    })

    expect(rc(['>=10'])).contains({
      ok: false,
      gaps: [ [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lt', m: 0 } ] ],
    })

    expect(rc(['>10'])).contains({
      ok: false,
      gaps: [ [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 0 } ] ],
    })

    expect(rc(['=10'])).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 1 } ],
        [ { n: 10, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
    })

  })
})
