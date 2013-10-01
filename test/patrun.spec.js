/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


if( typeof patrun === 'undefined' ) {
  var patrun = require('..')
}


function rs(x) {
  return (''+x).replace(/\s+/g,'').replace(/\n+/g,'')
}

describe('patrun', function(){

  it('empty', function(){
    expect( patrun().toString() ).toBe('')
  })


  it('add', function() {
    var r

    r = patrun()
    r.add( {a:'1'}, 'r1' )
    //console.log('01 '+rs(r))
    expect( rs(r) ).toBe( "a:1-><r1>")

    r = patrun()
    r.add( {a:'1',b:'2'}, 'r1' )
    //console.log('02 '+rs(r))
    expect( rs(r) ).toBe( "a:1->b:2-><r1>")

    r = patrun()
    r.add( {a:'1',b:'2',c:'3'}, 'r1' )
    //console.log('03 '+rs(r))
    expect( rs(r) ).toBe( "a:1->b:2->c:3-><r1>")

    r = patrun()
    r.add( {a:'1',b:'2'}, 'r1' )
    r.add( {a:'1',b:'3'}, 'r2' )
    //console.log('04 '+rs(r))
    expect( rs(r) ).toBe( "a:1->b:2-><r1>3-><r2>")

    r = patrun()
    r.add( {a:'1',b:'2'}, 'r1' )
    r.add( {a:'1',c:'3'}, 'r2' )
    //console.log('05 '+rs(r))
    expect( rs(r) ).toBe( "a:1->b:2-><r1>*->c:3-><r2>")

    r.add( {a:'1',d:'4'}, 'r3' )
    //console.log('06 '+rs(r))
    expect( rs(r) ).toBe( "a:1->b:2-><r1>*->c:3-><r2>*->d:4-><r3>")

    r = patrun()
    r.add( {a:'1',c:'2'}, 'r1' )
    r.add( {a:'1',b:'3'}, 'r2' )
    //console.log('07 '+rs(r))
    //console.log(r.top)
    expect( rs(r) ).toBe( "a:1->b:3-><r2>*->c:2-><r1>")
  })


  it('basic', function() {
    var rt1 = patrun()
    
    rt1.add( {p1:'v1'}, 'r1' )
    //console.log(""+rt1)
    expect( 'r1' ).toBe( rt1.find({p1:'v1'}))
    expect( null ).toBe( rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1'}, 'r1x' )
    //console.log(""+rt1)
    expect( 'r1x' ).toBe( rt1.find({p1:'v1'}))
    expect( null ).toBe( rt1.find({p2:'v1'}))

    rt1.add( {p1:'v2'}, 'r2' )
    //console.log(""+rt1)
    expect( 'r2' ).toBe( rt1.find({p1:'v2'}))
    expect( null ).toBe( rt1.find({p2:'v2'}))

    rt1.add( {p2:'v3'}, 'r3' )
    //console.log(rt1)
    expect( 'r3' ).toBe( rt1.find({p2:'v3'}))
    expect( null ).toBe( rt1.find({p2:'v2'}))
    expect( null ).toBe( rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1',p3:'v4'}, 'r4' )
    //console.log(rt1)
    expect( 'r4' ).toBe( rt1.find({p1:'v1',p3:'v4'}))
    expect( 'r1x' ).toBe( rt1.find({p1:'v1',p3:'v5'}))
    expect( null ).toBe( rt1.find({p2:'v1'}))
  })


  it('culdesac', function() {
    var rt1 = patrun()
    
    rt1.add( {p1:'v1'}, 'r1' )
    rt1.add( {p1:'v1',p2:'v2'}, 'r2' )
    rt1.add( {p1:'v1',p3:'v3'}, 'r3' )
    //console.log(''+rt1)

    expect( 'r1' ).toBe( rt1.find({p1:'v1',p2:'x'}))
    expect( 'r3' ).toBe( rt1.find({p1:'v1',p2:'x',p3:'v3'}))
  }),

  
  it('remove', function(){
    var rt1 = patrun()
    rt1.remove( {p1:'v1'} )
    //console.log(''+rt1)

    rt1.add( {p1:'v1'}, 'r0' )
    //console.log(''+rt1)
    expect( 'r0' ).toBe( rt1.find({p1:'v1'}))

    rt1.remove( {p1:'v1'} )
    //console.log(''+rt1)
    expect( null ).toBe( rt1.find({p1:'v1'}))

    rt1.add( {p2:'v2',p3:'v3'}, 'r1' )
    rt1.add( {p2:'v2',p4:'v4'}, 'r2' )
    //console.log(''+rt1)
    expect( 'r1' ).toBe( rt1.find({p2:'v2',p3:'v3'}))
    expect( 'r2' ).toBe( rt1.find({p2:'v2',p4:'v4'}))

    rt1.remove( {p2:'v2',p3:'v3'} )
    //console.log(''+rt1)
    expect( undefined ).toBe( rt1.find({p2:'v2',p3:'v3'}))
    expect( 'r2' ).toBe( rt1.find({p2:'v2',p4:'v4'}))

  })


  function findalltest(mode) {
    return function() {
      var rt1 = patrun()
      
      'subvals==mode' && rt1.add( {a:'1'}, 'x' )

      rt1.add( {p1:'v1'}, 'r0' )

      rt1.add( {p1:'v1',p2:'v2a'}, 'r1' )
      rt1.add( {p1:'v1',p2:'v2b'}, 'r2' )
      //console.log(rt1.toString())

      var found = rt1.findall({p1:'v1'})
      //require('eyes').inspect(found)
      expect( '[{"match":{"p1":"v1"} ).toBe( "data":"r0"}]',JSON.stringify(found))

      //return 

      found = rt1.findall({p1:'v1',p2:'*'})
      //require('eyes').inspect(found)
      expect( '[{"match":{"p1":"v1" ).toBe( "p2":"v2a"},"data":"r1"},{"match":{"p1":"v1","p2":"v2b"},"data":"r2"}]',JSON.stringify(found))


      rt1.add( {p1:'v1',p2:'v2c',p3:'v3a'}, 'r3a' )
      rt1.add( {p1:'v1',p2:'v2d',p3:'v3b'}, 'r3b' )
      //require('eyes').inspect(JSON.parse(''+rt1))
      found = rt1.findall({p1:'v1',p2:'*',p3:'v3a'})
      //console.log(JSON.stringify(found))
      expect( '[{"match":{"p1":"v1" ).toBe( "p2":"v2c","p3":"v3a"},"data":"r3a"}]',JSON.stringify(found))

      // gex can accept a list of globs
      found = rt1.findall({p1:'v1',p2:['v2a','v2b','not-a-value']})
      //console.log('found='+JSON.stringify(found))
      expect( '[{"match":{"p1":"v1" ).toBe( "p2":"v2a"},"data":"r1"},{"match":{"p1":"v1","p2":"v2b"},"data":"r2"}]',JSON.stringify(found))
    }
  }

  it('findall.topvals', findalltest('topvals'))
  it('findall.subvals', findalltest('subvals'))


  it('null-undef-nan', function(){
    var rt1 = patrun()
    
    rt1.add( {p1:null}, 'r1' )
    expect(  '{"d":"r1"}' ).toBe(  rt1.toJSON() )

    rt1.add( {p2:void 0}, 'r2' )
    expect(  '{"d":"r2"}' ).toBe(  rt1.toJSON() )

    rt1.add( {p99:'v99'}, 'r99' )
    expect(  '{"d":"r2" ).toBe( "k":"p99","v":{"v99":{"d":"r99"}}}', rt1.toJSON() )
  })


  it('star-backtrack', function(){
    var p = patrun()
    
    p.add( {a:1,b:2}, 'X' )
    p.add( {c:3}, 'Y' )
    
    //console.log(p)
    expect( p.find({a:1,b:2}) ).toBe('X')
    expect( p.find({a:1,b:0,c:3}) ).toBe('Y')

    p.add( {a:1,b:2,d:4}, 'XX' )
    p.add( {c:3,d:4}, 'YY' )
    //console.log(p)
    expect( p.find({a:1,b:2,d:4}) ).toBe('XX')
    expect( p.find({a:1,c:3,d:4}) ).toBe('YY')
    expect( p.find({a:1,b:2}) ).toBe('X')
    expect( p.find({a:1,b:0,c:3}) ).toBe('Y')
  })
})
