/* Copyright (c) 2020 Richard Rodger and other contributors, MIT License */
'use strict'

// TODO: interval - test <20&>10 === >10&<20


var Lab = require('@hapi/lab')
Lab = null != Lab.script ? Lab : require('hapi-lab-shim')

const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const Jsonic = require('jsonic')

const Matchers = require('../lib/matchers')


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
      .contains({ jo: 'and', o0: 'gte', n0: -Infinity, o1: 'lte', n1: 10 })
    expect(im.make('k','=10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','<10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: -Infinity, o1: 'lt', n1: 10})
    expect(im.make('k','>10').meta)
      .contains({ jo: 'and', o0: 'gt', n0: 10, o1: 'lte', n1: Infinity })
    expect(im.make('k','>=10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: Infinity })

    expect(im.make('k','10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','==10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    expect(im.make('k','===10').meta)
      .contains({ jo: 'or', o0: 'eq', n0: 10, o1: 'nil', n1: NaN })
    
    // fix below

    expect(im.make('k','=<10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: -Infinity, o1: 'lte', n1: 10 })
    expect(im.make('k','=>10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: Infinity })

    expect(im.make('k','x10').meta)
      .contains({ jo: 'or', o0: 'err' })

    expect(im.make('k','[10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: Infinity })
    expect(im.make('k','(10').meta)
      .contains({ jo: 'and', o0: 'gt', n0: 10, o1: 'lte', n1: Infinity })

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


    expect(im.make('k','<20&>10').meta)
      .contains({ jo: 'and', o0: 'gt', n0: 10, o1: 'lt', n1: 20 })
    expect(im.make('k','20..10').meta)
      .contains({ jo: 'and', o0: 'gte', n0: 10, o1: 'lte', n1: 20 })

  })


  it('interval-half', async () => {
    var im = new Matchers.IntervalMatcher()
    let rc = (x)=>im.complete(x.map(i=>im.make('k',i)))
    var hi = im.half_intervals

    var jm = (s) => ({meta:Jsonic(s[0])})
    var j = (s) => (Jsonic(s[0]))

    expect(hi([])).equal([])
    expect(hi([{meta:{}}])).equal([])

    expect(hi([jm`n0:1,o0:eq`])).equal([j`n:1,o:eq`])
    expect(hi([jm`n0:1,o0:lt`])).equal([j`n:1,o:lt`])
    expect(hi([jm`n0:1,o0:lte`])).equal([j`n:1,o:lte`])
    expect(hi([jm`n0:1,o0:gt`])).equal([j`n:1,o:gt`])
    expect(hi([jm`n0:1,o0:gte`])).equal([j`n:1,o:gte`])

    expect(hi([jm`n0:1,o0:gte,n1:2,o1:lt`])).equal([j`n:1,o:gte`,j`n:2,o:lt`])
    expect(hi([jm`n0:1,o0:gt,n1:2,o1:lt`])).equal([j`n:1,o:gt`,j`n:2,o:lt`])

    expect(hi([
      jm`n0:2,o0:gt,n1:3,o1:lt`,
      jm`n0:1,o0:gt,n1:3,o1:lt`,
    ])).equal([
      j`n:1,o:gt`,
      j`n:3,o:lt`,
      j`n:2,o:gt`,
      j`n:3,o:lt`,
    ])

    expect(hi([
      jm`n0:3,o0:gt,n1:4,o1:lt`,
      jm`n0:1,o0:gt,n1:2,o1:lt`,
      jm`n0:5,o0:gt,n1:6,o1:lt`,
    ])).equal([
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:3,o:gt`,
      j`n:4,o:lt`,
      j`n:5,o:gt`,
      j`n:6,o:lt`,
    ])

    // lt < lte
    expect(hi([
      jm`n0:1,o0:gt,n1:2,o1:lt`,
      jm`n0:1,o0:gt,n1:2,o1:lte`,
      jm`n0:3,o0:gt,n1:4,o1:lte`,
      jm`n0:3,o0:gt,n1:4,o1:lt`,
    ])).equal([
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lte`,
      j`n:3,o:gt`,
      j`n:4,o:lt`,
      j`n:3,o:gt`,
      j`n:4,o:lte`,
    ])

    var overs = [ [ { n: 1, o: 'gt', m: 10 }, { n: 2, o: 'lt', m: 11 } ] ]
    expect(rc(['>1&<2','>1&<=2']).overs).equal(overs)
    expect(rc(['>1&<=2','>1&<2']).overs).equal(overs)

    // gte < gt
    expect(hi([
      jm`n0:1,o0:gt,n1:2,o1:lt`,
      jm`n0:1,o0:gte,n1:2,o1:lt`,
      jm`n0:3,o0:gte,n1:4,o1:lt`,
      jm`n0:3,o0:gt,n1:4,o1:lt`,
    ])).equal([
      j`n:1,o:gte`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:3,o:gte`,
      j`n:4,o:lt`,
      j`n:3,o:gt`,
      j`n:4,o:lt`,
    ])

    // sort numerically
    expect(hi([
      jm`n0:3,o0:gt,n1:4.5,o1:lt`,
      jm`n0:3,o0:gt,n1:4,o1:lte`,
      jm`n0:1,o0:gt,n1:2,o1:lt`,
      jm`n0:1,o0:gt,n1:2,o1:lte`,
      jm`n0:5,o0:gt,n1:6,o1:lt`,
      jm`n0:7,o0:gte,n1:8,o1:lt`,
      jm`n0:7,o0:gt,n1:8,o1:lt`,
      jm`n0:5,o0:gte,n1:6,o1:lt`,
    ])).equal([
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
    ])


    // second term operationally
    expect(hi([
      jm`n0:1,o0:gt,n1:2,o1:lte`,
      jm`n0:1,o0:gt,n1:2,o1:lt`,
    ])).equal([
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lte`,
    ])


    // actually equal
    expect(hi([
      jm`n0:1,o0:gt,n1:2,o1:lt`,
      jm`n0:1,o0:gt,n1:2,o1:lt`,
    ])).equal([
      j`n:1,o:gt`,
      j`n:2,o:lt`,
      j`n:1,o:gt`,
      j`n:2,o:lt`,
    ])

    // two overs here!
    expect(rc(['>1&<2','>1&<2','>1&<2']).overs).equal([
      [ { n: 1, o: 'gt', m: 10 }, { n: 2, o: 'lt', m: 11 } ],
      [ { n: 1, o: 'gt', m: 10 }, { n: 2, o: 'lt', m: 11 } ],
    ])
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
          jo: 'and',
          n0: 20,
          n1: Infinity,
          o0: 'gt',
          o1: 'lte'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n0: -Infinity,
          n1: 10,
          o0: 'gte',
          o1: 'lt',
        }
      }
    ])

    
    var is0s = im.half_intervals(is0)
    //console.log(is0s)
    expect(is0s).equals([
      { n: -Infinity, o: 'gte' },
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 20, o: 'lte' },
      { n: 20, o: 'gt' },
      { n: Infinity, o: 'lte' },
    ])
    
    var is0c = im.complete(is0)
    //console.dir(is0c,{depth:null})
    expect(is0c).contains({
      ok: true,
      gaps: []
    })


    // With gaps
    
    var is1 = ['>=10&<=15','>20','<10'].map(i=>im.make('k',i))
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
          jo: 'and',
          n0: 20,
          n1: Infinity,
          o0: 'gt',
          o1: 'lte'
        }
      },
      {
        k: 'interval',
        m: {
          jo: 'and',
          n1: 10,
          n0: -Infinity,
          o1: 'lt',
          o0: 'gte'
        }
      },
    ])
    
    var is1s = im.half_intervals(is1)
    //console.log(is1s)
    expect(is1s).equals([
      { n: -Infinity, o: 'gte' },
      { n: 10, o: 'lt' },
      { n: 10, o: 'gte' },
      { n: 15, o: 'lte' },
      { n: 20, o: 'gt' },
      { n: Infinity, o: 'lte' }
    ])
    
    var is1c = im.complete(is1)
    //console.dir(is1c,{depth:null})
    expect(is1c).contains({
      ok: false,
      gaps: [
        [ { n: 15, o: 'gt', m: 4 }, { n: 20, o: 'lte', m: 5 } ],
      ]
    })


    let rc = (x)=>im.complete(x.map(i=>im.make('k',i)))

    expect(rc(['<10'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gte', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ]
    })

    expect(rc(['10)'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gte', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ]
    })

    expect(rc(['<=10'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ],
    })

    expect(rc(['10]'])).contains({
      ok: false,
      gaps: [ [ { n: 10, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ] ],
    })

    
    expect(rc(['>=10'])).contains({
      ok: false,
      gaps: [ [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lt', m: 0 } ] ],
    })

    expect(rc(['[10'])).contains({
      ok: false,
      gaps: [ [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lt', m: 0 } ] ],
    })

    
    expect(rc(['>10'])).contains({
      ok: false,
      gaps: [ [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 0 } ] ],
    })

    expect(rc(['(10'])).contains({
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

    expect(rc(['10'])).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 1 } ],
        [ { n: 10, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
    })


    //console.dir(rc(['10..20']),{depth:null})
    expect(rc(['10..20'])).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lt', m: 0 } ],
        [ { n: 20, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
    })

    expect(rc(['10.5..20.5'])).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10.5, o: 'lt', m: 0 } ],
        [ { n: 20.5, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
    })

    // console.dir(rc(['[1.05e1,205e-1]']),{depth:null})
    expect(rc(['[1.05e1,205e-1]'])).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10.5, o: 'lt', m: 0 } ],
        [ { n: 20.5, o: 'gt', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
    })

  })


  it('interval-overlaps', async () => {
    var im = new Matchers.IntervalMatcher()
    let rc = (x)=>im.complete(x.map(i=>im.make('k',i)))

    var is0 = ['<=10', '<20','>10', '>=20'].map(i=>im.make('k',i))
    // console.log(is0)

    // var is0s = im.half_intervals(is0)
    // console.log(is0s)
    
    var is0c = im.complete(is0)
    // console.dir(is0c,{depth:null})

    expect(is0c).contains({
      ok: true,
      gaps: [],
      overs: [
        [ { n: -Infinity, o: 'gte', m: 10 }, { n: 10, o: 'lte', m: 11 } ],
        [ { n: 10, o: 'gt', m: 10 }, { n: 20, o: 'lt', m: 11 } ],
        [ { n: 20, o: 'gte', m: 10 }, { n: Infinity, o: 'lte', m: 11 } ]
      ],
    })

    
    // With gaps

    var is1 = ['<20','>10'].map(i=>im.make('k',i))
    //console.log(is1)

    //var is1s = im.half_intervals(is1)
    //console.log(is1s)
    
    var is1c = im.complete(is1)
    //console.dir(is1c,{depth:null})

    expect(is1c).contains({
      ok: true,
      gaps: [],
      overs: [ [ { n: 10, o: 'gt', m: 10 }, { n: 20, o: 'lt', m: 11 } ] ],
    })

    
    // same direction
    
    var is2 = ['>20','>10'].map(i=>im.make('k',i))
    //console.log(is2)

    //var is2s = im.half_intervals(is2)
    //console.log(is2s)
    
    var is2c = im.complete(is2)
    //console.dir(is2c,{depth:null})

    expect(is2c).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 0 } ]
      ],
      overs: [
        [ { n: 20, o: 'gt', m: 10 }, { n: Infinity, o: 'lte', m: 11 } ]
      ],
    })


    var is3 = ['>10','>20','>30'].map(i=>im.make('k',i))
    //console.log(is3)

    //var is3s = im.half_intervals(is3)
    //console.log(is3s)
    
    var is3c = im.complete(is3)
    //console.dir(is3c,{depth:null})

    expect(is3c).contains({
      ok: false,
      gaps: [
        [ { n: -Infinity, o: 'gte' }, { n: 10, o: 'lte', m: 0 } ]
      ],
      overs: [
        [ { n: 20, o: 'gt', m: 10 }, { n: Infinity, o: 'lte', m: 11 } ],
        [ { n: 30, o: 'gt', m: 10 }, { n: Infinity, o: 'lte', m: 11 } ],
      ],
    })
    
    // console.dir(rc(['<10','<20','<30']),{depth:null})
    expect(rc(['<10','<20','<30'])).contains({
      ok: false,
      gaps: [
        [ { n: 30, o: 'gte', m: 6 }, { n: Infinity, o: 'lte', m: 7 } ]
      ],
      overs: [
        [ { n: -Infinity, o: 'gte', m: 10 }, { n: 10, o: 'lt', m: 11 },  ],
        [ { n: -Infinity, o: 'gte', m: 10 }, { n: 20, o: 'lt', m: 11 },  ],
      ],
    })

    // console.dir(rc(['<10','[10,20]','[15,25]', '>25']),{depth:null})
    expect(rc(['<10','[10,20]','[15,25]', '>25'])).contains({
      ok: true,
      gaps: [],
      overs: [ [ { n: 15, o: 'gte', m: 10 }, { n: 20, o: 'lte', m: 11 } ] ],
    })

    console.dir(rc(['<10&=10','=20&>20']),{depth:null})
    expect(rc(['<10&=10','=20&>20'])).contains({
      ok: true,
      gaps: [],
      overs: [ [ { n: 10, o: 'gt' }, { n: 20, o: 'lt' } ] ],
    })
  })
})
