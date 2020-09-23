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

  it('interval-completion', async () => {
    var im = new Matchers.IntervalMatcher()

    var is0 = ['>=10&<=20','>20','<10'].map(i=>im.make('k',i))
    // console.log(is0)
    expect(is0).exists()
    
    var is0s = im.half_intervals(is0)
    // console.log(is0s)
    expect(is0s).exists()
    
    var is0c = im.complete(is0)
    // console.dir(is0c,{depth:null})
    expect(is0c).exists()

    var is1 = ['>=10&<=15','>20','<10','<30'].map(i=>im.make('k',i))
    // console.log(is1)
    expect(is1).exists()
    
    var is1s = im.half_intervals(is1)
    // console.log(is1s)
    expect(is1s).exists()
    
    var is1c = im.complete(is1)
    // console.dir(is1c,{depth:null})
    expect(is1c).exists()
  })
})
