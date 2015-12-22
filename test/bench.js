/* Copyright (c) 2013-2014 Richard Rodger, MIT License */
"use strict";

var util = require('util')


var Benchmark = require('benchmark')
var assert = require('assert')


var patrun = require('..')


var p0 = patrun()
var p0n = patrun()

var k0 = []
for(var i = 0; i < 100; i++ ) {
  k0[i] = ''+Math.random()
  var p = {}
  p[k0[i]] = k0[i]
  p0.add(p,k0[i])
}

// validate data
for(var i = 0; i < 100; i++ ) {
  var p = {}
  p[k0[i]] = k0[i]
  assert.equal(p0.find(p),k0[i])
}


var I = 300, J = 1000

var bs = Date.now()

var p1 = patrun()
var k1x = [], k1y = []
for(var i = 0; i < I; i++ ) {
  k1x[i] = 'x'+(i)
}
for(var j = 0; j < J; j++ ) {
  k1y[j] = 'y'+(j)
}

for(var i = 0; i < I; i++ ) {
  for(var j = 0; j < J; j++ ) {
    var p = {}
    p[k1x[i]] = k1x[i]
    p[k1y[j]] = k1y[j]

    p1.add(p,k1x[i]+'~'+k1y[j])
  }
}

var be = Date.now()

console.log('BUILT: '+(be-bs))

//console.log(p1)

// validate data
for(var i = 0; i < I; i++ ) {
  for(var j = 0; j < J; j++ ) {
    var p = {}
    p[k1x[i]] = k1x[i]
    p[k1y[j]] = k1y[j]

    assert.equal(p1.find(p),k1x[i]+'~'+k1y[j])
  }
}




function run0() {

  var s0 = new Benchmark.Suite()

  for(var i = 0; i < 100; i++ ) {
    s0.add('top-find:'+i,function(){
      for(var j = 0; j < i; j++ ) {
        var p = {}
        p[k0[i]] = k0[i]
        p0.find(p)
      }
    })
  }

  s0
    .on('cycle', function(event) {
      console.log(event.target.toString()+':'+util.inspect(process.memoryUsage()))
    })
    .run( {maxTime:2})
}


function run1() {

  var s1 = new Benchmark.Suite()

  var i = 0

  s1.add('top-find',function(){
    var p = {}
    p[k0[i]] = k0[i]
    p0.find(p)
    i++
    i %= 100
  })

  s1
    .on('cycle', function(event) {
      console.log(event.target.toString()+':'+util.inspect(process.memoryUsage()))
    })
    .run( {maxTime:20})
}


function run2() {

  var s2 = new Benchmark.Suite()


  var ij = [], ijmax = []

  for ( var k = 1; k <= 10; k++ ) {
    for ( var l = 1; l <= 10; l++ ) {
      var w = 10*k+l

      ijmax[w] = [I*k,J*l]
      ij[w]    = [0,0]

      s2.add(
        'd2-find '+ijmax[w][0]+','+ijmax[w][1],
        (function(w,imax,jmax){
          return function() {
            var p = {}, i = ij[w][0], j = ij[w][1]
            p[k1x[i]] = k1x[i]
            p[k1y[j]] = k1y[j]
            p0.find(p)
            i++
            if( imax == i ) {
              ij[k*l][0] = 0
              j++
            }
            if( jmax == j ) {
              ij[k*l][1] = 0
            }
          }
        })(w,ijmax[w][0],ijmax[w][1])
      )
    }
  }


  s2
    .on('cycle', function(event) {
      console.log(event.target.toString()+':'+util.inspect(process.memoryUsage()))
    })
    .run( {maxTime:2})

}

run2()
