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
  it('interval', async () => {
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
})
