/* Copyright (c) 2013-2020 Richard Rodger, MIT License, https://github.com/rjrodger/patrun */

// TODO: expose walk as method for general purpose

// TODO: convert gex to TS
const gex = require('gex')

import { MatchValue, GexMatcher } from './lib/matchers'


module.exports = function(custom: any) {
  return new (Patrun as any)(custom)
}

function Patrun(custom: any) {
  custom = custom || {}

  var self: any = {}
  var top: any = {}

  // Provide internal search order structure
  self.top = function() {
    return top
  }

  self.add = function(pat: any, data: any) {
    pat = { ...pat }

    var customizer =
      'function' === typeof custom ? custom.call(self, pat, data) : null

    // TODO: should accept options (rename custom)
    let gexmatcher = new GexMatcher()

    var keys = Object
      .keys(pat)
      .filter(key => null != pat[key])
      .sort()

    keys.forEach(function(key) {
      pat[key] = String(pat[key])
    })

    var keymap: any = top
    var valmap: any

    // Partial matches return next wider match - see partial-match test

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var fix = pat[key]

      //var gexer = custom.gex && val.match(/[*?]/) ? gex(val) : null
      let gexer = gexmatcher.make(key, fix) as any
      if (gexer) gexer.val$ = fix

      var sort_prefix = (gexer ? '1' : '0') + '~'
      var sort_key = sort_prefix + key

      valmap = keymap.v

      if (valmap && sort_key == keymap.sk) {
        add_gexer(keymap, key, gexer)
        keymap = valmap[fix] || (valmap[fix] = {})
      } else if (!keymap.k) {
        add_gexer(keymap, key, gexer)
        keymap.k = key
        keymap.sk = sort_key
        keymap.v = {}
        keymap = keymap.v[fix] = {}
      } else if (sort_key < keymap.sk) {
        var s = keymap.s,
          g = keymap.g
        keymap.s = { k: keymap.k, sk: keymap.sk, v: keymap.v }
        if (s) keymap.s.s = s
        if (g) keymap.s.g = g

        if (keymap.g) keymap.g = {}
        add_gexer(keymap, key, gexer)

        keymap.k = key
        keymap.sk = sort_key
        keymap.v = {}

        keymap = keymap.v[fix] = {}
      } else {
        valmap = keymap.v
        keymap = keymap.s || (keymap.s = {})
        i--
      }
    }

    if (void 0 !== data && keymap) {
      keymap.d = data
      if (customizer) {
        keymap.f =
          'function' === typeof customizer ? customizer : customizer.find
        keymap.r =
          'function' === typeof customizer.remove ? customizer.remove : void 0
      }
    }

    return self
  }

  function add_gexer(keymap: any, key: any, gexer: any) {
    if (!gexer) return

    var g = (keymap.g = keymap.g || {})
    var ga = (g[key] = g[key] || [])
    ga.push(gexer)

    /*
    ga.sort(function(a: any, b: any) {
      return a.val$ < b.val$
    })
    */

    // console.log('K', key, ga.length)
  }

  self.findexact = function(pat: any) {
    return self.find(pat, true)
  }

  self.find = function(pat: any, exact: any, collect: any) {
    if (null == pat) return null

    var keymap: any = top
    var data: any = void 0 === top.d ? null : top.d
    var finalfind = top.f
    var key = null
    var stars = []
    var foundkeys: any = {}
    var patlen = Object.keys(pat).length
    var collection = []

    if (void 0 !== top.d) {
      collection.push(top.d)
    }

    do {
      key = keymap.k

      if (keymap.v) {
        var val = pat[key]

        // Matching operation is either string equality (by prop lookup)
        // or gex match.

        var nextkeymap = keymap.v[val]

        if (!nextkeymap && custom.gex && keymap.g && keymap.g[key]) {
          var ga = keymap.g[key]
          for (var gi = 0; gi < ga.length; gi++) {
            //if (null != ga[gi].on(val)) {
            if (ga[gi].match(val)) {
              nextkeymap = keymap.v[ga[gi].val$]
              break
            }
          }
        }

        if (nextkeymap) {
          foundkeys[key] = true

          if (keymap.s) {
            stars.push(keymap.s)
          }

          data = void 0 === nextkeymap.d ? (exact ? null : data) : nextkeymap.d

          if (collect && void 0 !== nextkeymap.d) {
            collection.push(nextkeymap.d)
          }

          finalfind = nextkeymap.f
          keymap = nextkeymap
        }

        // no match found for this value, follow star trail
        else {
          keymap = keymap.s
        }
      } else {
        keymap = null
      }

      if (
        null == keymap &&
        0 < stars.length &&
        (null == data || (collect && !exact))
      ) {
        keymap = stars.pop()
      }
    } while (keymap)

    if (exact) {
      if (Object.keys(foundkeys).length !== patlen) {
        data = null
      }
    } else {
      // If there's root data, return as a catch all
      if (null == data && void 0 !== top.d) {
        data = top.d
      }
    }

    if (finalfind) {
      data = finalfind.call(self, pat, data)
    }

    return collect ? collection : data
  }

  self.remove = function(pat: any) {
    var keymap = top
    var data = null
    var key
    var path = []

    do {
      key = keymap.k

      if (keymap.v) {
        // TODO: equivalence match as per find
        var nextkeymap = keymap.v[pat[key]]

        if (nextkeymap) {
          path.push({ km: keymap, v: pat[key] })
          data = nextkeymap.d
          keymap = nextkeymap
        } else {
          keymap = keymap.s
        }
      } else {
        keymap = null
      }
    } while (keymap)

    if (void 0 !== data) {
      var part = path[path.length - 1]
      if (part && part.km && part.km.v) {
        var point = part.km.v[part.v]
        if (!point.r || point.r(pat, point.d)) {
          delete point.d
        }
      }
    }
  }

  // values can be verbatim, glob, or array of globs
  self.list = function(pat: any, exact: boolean) {
    pat = pat || {}

    function descend(keymap: any, match: any, missing: any, acc: any) {
      if (keymap.v) {
        var key = keymap.k
        var gexval = gex(
          pat ? (null == pat[key] ? (exact ? null : '*') : pat[key]) : '*'
        )
        var itermatch = { ...match }
        var itermissing = { ...missing }
        var nextkeymap

        for (var val in keymap.v) {
          if (
            val === pat[key] ||
            (!exact && null == pat[key]) ||
            gexval.on(val)
          ) {
            var valitermatch = { ...itermatch }
            valitermatch[key] = val

            var valitermissing = { ...itermissing }
            delete valitermissing[key]

            nextkeymap = keymap.v[val]

            if (
              0 === Object.keys(valitermissing).length &&
              nextkeymap &&
              nextkeymap.d
            ) {
              acc.push({
                match: valitermatch,
                data: nextkeymap.d,
                find: nextkeymap.f,
              })
            }

            if (nextkeymap && null != nextkeymap.v) {
              descend(
                nextkeymap,
                { ...valitermatch },
                { ...valitermissing },
                acc
              )
            }
          }
        }

        nextkeymap = keymap.s
        if (nextkeymap) {
          descend(nextkeymap, { ...itermatch }, { ...itermissing }, acc)
        }
      }
    }

    var acc = []

    if (top.d) {
      acc.push({
        match: {},
        data: top.d,
        find: top.f,
      })
    }

    descend(top, {}, { ...pat }, acc)
    return acc
  }

  self.toString = function(first: any, second: any) {
    var tree = true === first ? true : !!second

    var dstr =
      'function' === typeof first
        ? first
        : function(d: any) {
          return 'function' === typeof d ? '<' + d.name + '>' : '<' + d + '>'
        }

    function indent(o: any, d: any) {
      for (var i = 0; i < d; i++) {
        o.push(' ')
      }
    }

    var str: any[] = []

    function walk(n: any, o: any, d: any, vs: any) {
      var vsc

      if (void 0 !== n.d) {
        o.push(' ' + dstr(n.d))

        str.push(vs.join(', ') + ' -> ' + dstr(n.d))
      }
      if (n.k) {
        o.push('\n')
        indent(o, d)
        o.push(n.k + ':')
      }
      if (n.v) {
        d++
        var pa = Object.keys(n.v)
        var pal = pa.filter(function(x) {
          return !x.match(/[*?]/)
        })
        var pas = pa.filter(function(x) {
          return x.match(/[*?]/)
        })
        pal.sort()
        pas.sort()
        pa = pal.concat(pas)

        for (var pi = 0; pi < pa.length; pi++) {
          var p = pa[pi]
          o.push('\n')
          indent(o, d)
          o.push(p + ' ->')

          vsc = vs.slice()
          vsc.push(n.k + '=' + p)

          walk(n.v[p], o, d + 1, vsc)
        }

        if (n.s) {
          o.push('\n')
          indent(o, d)
          o.push('|')

          vsc = vs.slice()
          walk(n.s, o, d + 1, vsc)
        }
      }
    }

    var o: any = []
    walk(top, o, 0, [])
    return tree ? o.join('') : str.join('\n')
  }

  self.inspect = self.toString

  self.toJSON = function(indent: any) {
    return JSON.stringify(
      top,
      function(key: any, val: any) {
        if ('function' === typeof val) return '[Function]'
        return val
      },
      indent
    )
  }

  return self
}



