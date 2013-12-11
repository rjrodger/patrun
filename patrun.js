/* Copyright (c) 2013 Richard Rodger, MIT License, https://github.com/rjrodger/patrun */

(function() {
  /* jshint node:true, asi:true, eqnull:true */
  "use strict";

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
      root.patrun = previous_patrun;
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

      if( void 0 !== data && keymap ) {
        keymap.d = data
      }
      
      return self
    }


    self.findexact = function( pat ) {
      return self.find( pat, true )
    }

    self.find = function( pat, exact ) {
      var keymap = top
      var data = null
      var key
      var stars = []
      var foundkeys = {}

      do {
        key = keymap.k

        if( keymap.v ) {
          var nextkeymap = keymap.v[pat[key]]
          if( nextkeymap ) {
            foundkeys[key]=true

            if( keymap.s ) {
              stars.push(keymap.s)
            }

            data = nextkeymap.d || null
            keymap = nextkeymap
          }
          else {
            keymap = keymap.s
          }
        }
        else {
          keymap = null
        }
       
        if( null == keymap && null === data && 0 < stars.length ) {
          keymap = stars.pop()
        }
      }
      while( keymap )

      // special case for default with no properties
      if( null === data && 0 === _.keys(pat).length && void 0 !== top.d ) {
        data = top.d
      }

      if( exact && _.keys(foundkeys).length != _.keys(pat).length ) {
        data = null
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
            keymap = keymap.s
          }
        }
        else {
          keymap = null
        }
      }
      while( keymap )

      if( void 0 !== data ) {
        var part = path[path.length-1]
        if( part && part.km && part.km.v ) {
          //delete part.km.v[part.v]
          delete part.km.v[part.v].d
        }
      }
    }



    // values can be veratim, glob, or array of globs
    self.findall = function( pat ) {
      function descend(keymap,match,missing,acc) {

        if( keymap.v ) {
          var key = keymap.k
          var gexval = gex( pat ? pat[key] : '*'  )
          var nextkeymap, itermatch, itermissing
          
          for( var val in keymap.v ) {
            itermatch   = _.extend({},match)
            itermissing = _.extend({},missing)

            if( gexval.on(val) ) {
              var valitermatch = _.clone(itermatch)
              valitermatch[key]=val
              delete itermissing[key]

              nextkeymap = keymap.v[ val ]

              if( 0 === _.keys(itermissing).length && nextkeymap && nextkeymap.d ) {
                acc.push({match:valitermatch,data:nextkeymap.d})
              }
              else if( nextkeymap && nextkeymap.v ) {
                descend(nextkeymap, _.extend({},valitermatch), _.extend({},itermissing), acc)
              }
            }
          }

          nextkeymap = keymap.s
          if( nextkeymap ) {
            descend(nextkeymap, _.extend({},itermatch), _.extend({},itermissing), acc)
          }
        }
      }

      var acc = []
      descend(top,{},_.extend({},pat),acc)
      return acc
    }



    self.toString = function(dstr,tree) {
      dstr = _.isFunction(dstr) ? dstr : function(d){
        return _.isFunction(d) ? '<'+d.name+'>' : '<'+d+'>'}

      tree = _.isBoolean( arguments[0] ) ? arguments[0] : tree
      tree = void 0 === tree ? false : tree

      function indent(o,d) {
        for(var i = 0; i < d; i++ ) {
          o.push(' ')
        }
      }

      var str = []

      function walk(n,o,d,vs){
        var vsc

        if( void 0 !== n.d ) {
          indent(o,d)
          o.push(dstr(n.d))
          //if( 0 === d ) {
          //  o.push('\n')
          //}

          str.push( vs.join(', ')+' -> '+dstr(n.d))
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

            vsc = _.clone(vs)
            vsc.push(n.k+'='+p)

            walk(n.v[p],o,d+1,vsc)
          }

          if( n.s ) {
            o.push('\n')
            indent(o,d)
            o.push( '* ->')

            vsc = _.clone(vs)
            //vsc.push(n.k+'=*')
            
            walk(n.s,o,d+1,vsc)
          }
        }
      }

      var o = []
      walk(top,o,0,[])
      return tree ? o.join('') : str.join('\n')
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
