/* Copyright (c) 2013 Richard Rodger, MIT License, https://github.com/rjrodger/patrun */
"use strict";


(function() {
  var root           = this
  var previous_patrun = root.patrun

  var has_require = typeof require !== 'undefined'

  var _   = root._
  var gex = root.gex

  if( typeof _ === 'undefined' ) {
    if( has_require ) {
      _ = require('underscore')
    }
    else throw new Error('patrun requires underscore, see http://underscorejs.org');
  }

  if( typeof gex === 'undefined' ) {
    if( has_require ) {
      gex = require('gex')
    }
    else throw new Error('patrun requires gex, see https://github.com/rjrodger/gex')
  }


  var patrun = root.patrun = function() {
    var self = {}

    var top = {}


    self.noConflict = function() {
      root.previous_patrun = previous_patrun;
      return self;
    }


    self.add = function( pat, data ) {
      var keys = _.keys(pat).sort()

      var keymap = top
      var valmap

      for( var i = 0; i < keys.length; i++ ) {
        var key = keys[i]
        var val = pat[key]
        
        if( null === val || void 0 === val ) continue;

        valmap = keymap.v
        if( valmap && key == keymap.k) {
          keymap = valmap[val] || (valmap[val]={})
        }
        else if( !keymap.k ) {
          keymap.k = key
          keymap.v = {}
          keymap = keymap.v[val] = {}
        }
        else {
          if( key < keymap.k ) {
            var curv = keymap.v
            var curs   = keymap.s
            keymap.v = {}
            //keymap.v[''] = {k:keymap.k,v:curvalmap}
            keymap.s = {k:keymap.k,v:curv,s:curs}

            keymap.k = key
            keymap = keymap.v[val] = {}
          }
          else {
            valmap = keymap.v
            //keymap = valmap[''] || (valmap['']={})
            keymap = keymap.s || (keymap.s = {})
            i--
          }
        }
      }

      if( !(void 0 === data) && keymap ) {
        keymap.d = data
      }
      
      return self
    }


    self.find = function( pat ) {
      var keymap = top
      var data = null
      var key

      do {
        key = keymap.k

        if( keymap.v ) {
          var nextkeymap = keymap.v[pat[key]]
          if( nextkeymap ) {
            data   = nextkeymap.d
            keymap = nextkeymap
          }
          else {
            //keymap = keymap.v['']
            keymap = keymap.s
          }
        }
        else {
          keymap = null
        }
      }
      while( keymap )

      // special case for default with no properties
      if( null === data && 0 === _.keys(pat).length && void 0 !== top.d ) {
        data = top.d
      }

      return data
    }


    self.remove = function( pat ) {
      var keymap = top
      var data = null
      var key
      var path = []

      do {
        key = keymap.k

        if( keymap.v ) {
          var nextkeymap = keymap.v[pat[key]]
          if( nextkeymap ) {
            path.push({km:keymap,v:pat[key]})
            data   = nextkeymap.d
            keymap = nextkeymap
          }
          else {
            //keymap = keymap.v['']
            keymap = keymap.s
          }
        }
        else {
          keymap = null
        }
      }
      while( keymap )

      if( !(void 0 === data) ) {
        //console.dir(path)
        var part = path[path.length-1]
        if( part && part.km && part.km.v ) {
          delete part.km.v[part.v]
        }
      }
    }



    // values can be veratim, glob, or array of globs
    self.findall = function( pat ) {
      function descend(keymap,match,missing,acc) {

        if( keymap.v ) {
          var key = keymap.k
          var gexval = gex( pat[key] )

          
          //for( var val in keymap.v ) {
          //  eachval(val)
          //}
          //if( keymap.s) { eachval(keymap.s) }
          //function eachval() {

          for( var val in keymap.v ) {
            var itermatch   = _.extend({},match)
            var itermissing = _.extend({},missing)

            if( gexval.on(val) ) {
              itermatch[key]=val
              delete itermissing[key]

              var nextkeymap = keymap.v[ val ]

              if( 0 == _.keys(itermissing).length && nextkeymap && nextkeymap.d ) {
                acc.push({match:itermatch,data:nextkeymap.d})
              }
              else if( nextkeymap && nextkeymap.v ) {
                descend(nextkeymap, _.extend({},itermatch), _.extend({},itermissing), acc)
              }
            }
          }

          //var nextkeymap = keymap.v['']
          var nextkeymap = keymap.s
          if( nextkeymap ) {
            descend(nextkeymap, _.extend({},itermatch), _.extend({},itermissing), acc)
          }
        }
      }

      var acc = []
      descend(top,{},_.extend({},pat),acc)
      return acc
    }



    self.toString = function(dstr) {
      dstr = _.isFunction(dstr) ? dstr : function(d){
        return _.isFunction(d) ? '<'+d.name+'>' : '<'+d+'>'}

      function indent(o,d) {
        for(var i = 0; i < d; i++ ) {
          o.push(' ')
        }
      }

      function walk(n,o,d, p){
        //console.log('walk',n.k,n.v,n.d,o.join('').replace(/\n/g,''),d,p)
        if( !(void 0 === n.d) ) {
          indent(o,d)
          o.push(dstr(n.d))
          //if( 0 === d ) {
          //  o.push('\n')
          //}
        }
        if( n.k ) {
          o.push('\n')
          indent(o,d)
          o.push(n.k+':')
        }
        if( n.v ) {
          d++
          for( var p in n.v ) {
            o.push('\n')
            indent(o,d)
            //o.push( (''===p?'*':p)+' ->')
            o.push( p+' ->')

            //console.log('DESC',''+p,JSON.stringify(n.v[p]),JSON.stringify(n.v))
            walk(n.v[p],o,d+1, p)
          }

          if( n.s ) {
            o.push('\n')
            indent(o,d)
            o.push( '* ->')
            walk(n.s,o,d+1, p)
          }
        }
      }

      var o = []
      walk(top,o,0, '')
      return o.join('')
    }


    self.inspect = self.toString


    self.toJSON = function(indent) {
      return JSON.stringify(top,function(key,val){
        if( _.isFunction(val) ) return '[Function]'
        return val
      },indent)
    }

    return self

  }



  if( typeof exports !== 'undefined' ) {
    if( typeof module !== 'undefined' && module.exports ) {
      exports = module.exports = patrun
    }
    exports.patrun = patrun
  } 
  else {
    root.patrun = patrun
  }

}).call(this);
