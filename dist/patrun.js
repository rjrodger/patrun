"use strict";
/* Copyright (c) 2013-2022 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gex = exports.Patrun = void 0;
// TODO: matchers should accept string[] of key names - only operate on these keys
// TODO: expose walk as method for general purpose
const gex_1 = require("gex");
Object.defineProperty(exports, "Gex", { enumerable: true, get: function () { return gex_1.Gex; } });
const matchers_1 = require("./lib/matchers");
function Patrun(custom) {
    custom = custom || {};
    var self = {};
    var top = {};
    let matchers = [];
    if (custom.gex) {
        matchers.push(new matchers_1.GexMatcher());
    }
    if (custom.interval) {
        matchers.push(new matchers_1.IntervalMatcher());
    }
    // Provide internal search order structure
    self.top = function () {
        return top;
    };
    self.add = function (pat, data) {
        pat = { ...pat };
        var customizer = 'function' === typeof custom ? custom.call(self, pat, data) : null;
        var keys = Object.keys(pat)
            .filter((key) => null != pat[key])
            .sort();
        keys.forEach(function (key) {
            pat[key] = String(pat[key]);
        });
        var keymap = top;
        var valmap;
        // Partial matches return next wider match - see partial-match test.
        // Traverse the key path (keys are ordered), insert preserves order.
        for (var i = 0; i < keys.length; i++) {
            // console.log('L', i, keys.length)
            var key = keys[i];
            var fix = pat[key];
            let mv = matchers.reduce((m, t) => m || t.make(key, fix), undefined);
            // if (mv) mv.val$ = fix
            valmap = keymap.v;
            // console.log('S0',key,fix,keymap,valmap)
            // An existing key
            if (valmap && key == keymap.k) {
                // console.log('S1-a')
                // add_mv(keymap, key, mv)
                if (mv) {
                    var g = (keymap.g = keymap.g || {});
                    var ga = (g[key] = g[key] || []);
                    mv = (ga.find((gmv) => gmv.same(mv)) ||
                        (ga.push(mv), mv));
                    keymap = mv.keymap || (mv.keymap = {});
                }
                else {
                    keymap = valmap[fix] || (valmap[fix] = {});
                }
            }
            // End of key path reached, so this is a new key, ordered last
            else if (!keymap.k) {
                keymap.k = key;
                keymap.v = {};
                if (mv) {
                    var g = (keymap.g = keymap.g || {});
                    var ga = (g[key] = g[key] || []);
                    mv = (ga.find((gmv) => gmv.same(mv)) ||
                        (ga.push(mv), mv));
                    keymap = mv.keymap || (mv.keymap = {});
                }
                else {
                    keymap = keymap.v[fix] = {};
                }
            }
            // Insert key orders before next existing key in path, so insert
            else if (key < keymap.k) {
                // console.log('S1-c', key, keymap.k)
                var s = keymap.s;
                var g = keymap.g;
                keymap.s = {
                    k: keymap.k,
                    // sk: keymap.sk,
                    v: keymap.v,
                };
                if (s) {
                    keymap.s.s = s;
                }
                if (g) {
                    keymap.s.g = g;
                }
                if (keymap.g) {
                    keymap.g = {};
                }
                keymap.k = key;
                keymap.v = {};
                if (mv) {
                    var g = (keymap.g = keymap.g || {});
                    var ga = (g[key] = g[key] || []);
                    mv = (ga.find((gmv) => gmv.same(mv)) ||
                        (ga.push(mv), mv));
                    keymap = mv.keymap || (mv.keymap = {});
                }
                else {
                    keymap = keymap.v[fix] = {};
                }
            }
            // Follow star path
            else {
                keymap = keymap.s || (keymap.s = {});
                // NOTE: current key is still not inserted
                i--;
            }
        }
        if (void 0 !== data && keymap) {
            keymap.d = data;
            if (customizer) {
                keymap.f =
                    'function' === typeof customizer ? customizer : customizer.find;
                keymap.r =
                    'function' === typeof customizer.remove ? customizer.remove : void 0;
            }
        }
        return self;
    };
    self.findexact = function (pat) {
        return self.find(pat, true);
    };
    self.find = function (pat, exact, collect) {
        if (null == pat)
            return null;
        var keymap = top;
        var data = void 0 === top.d ? null : top.d;
        var finalfind = top.f;
        var key = null;
        var stars = [];
        var foundkeys = {};
        var patlen = Object.keys(pat).length;
        var collection = [];
        if (void 0 !== top.d) {
            collection.push(top.d);
        }
        do {
            key = keymap.k;
            if (keymap.v) {
                var val = pat[key];
                // Matching operation is either string equality (by prop lookup)
                // or gex match.
                var nextkeymap = keymap.v[val];
                if (!nextkeymap && keymap.g && keymap.g[key]) {
                    var ga = keymap.g[key];
                    for (var gi = 0; gi < ga.length; gi++) {
                        if (ga[gi].match(val)) {
                            nextkeymap = ga[gi].keymap;
                            break;
                        }
                    }
                }
                if (nextkeymap) {
                    foundkeys[key] = true;
                    if (keymap.s) {
                        stars.push(keymap.s);
                    }
                    data = void 0 === nextkeymap.d ? (exact ? null : data) : nextkeymap.d;
                    if (collect && void 0 !== nextkeymap.d) {
                        collection.push(nextkeymap.d);
                    }
                    finalfind = nextkeymap.f;
                    keymap = nextkeymap;
                }
                // no match found for this value, follow star trail
                else {
                    keymap = keymap.s;
                }
            }
            else {
                keymap = null;
            }
            if (null == keymap &&
                0 < stars.length &&
                (null == data || (collect && !exact))) {
                keymap = stars.pop();
            }
        } while (keymap);
        if (exact) {
            if (Object.keys(foundkeys).length !== patlen) {
                data = null;
            }
        }
        else {
            // If there's root data, return as a catch all
            if (null == data && void 0 !== top.d) {
                data = top.d;
            }
        }
        if (finalfind) {
            data = finalfind.call(self, pat, data);
        }
        return collect ? collection : data;
    };
    self.remove = function (pat) {
        var keymap = top;
        var data = null;
        var key;
        var path = [];
        do {
            key = keymap.k;
            // console.log('keymap v g', keymap.v, keymap.g)
            if (keymap.v || keymap.g) {
                if (keymap.v) {
                    var nextkeymap = keymap.v[pat[key]];
                    if (nextkeymap) {
                        path.push({ km: keymap, v: pat[key] });
                    }
                }
                if (null == nextkeymap && keymap.g) {
                    let mvs = keymap.g[key] || [];
                    for (let mvi = 0; mvi < mvs.length; mvi++) {
                        // TODO: should parse!
                        if (mvs[mvi].fix === pat[key]) {
                            path.push({ km: keymap, v: pat[key], mv: mvs[mvi] });
                            nextkeymap = mvs[mvi].keymap;
                            break;
                        }
                    }
                }
                if (nextkeymap) {
                    data = nextkeymap.d;
                    keymap = nextkeymap;
                }
                else {
                    keymap = keymap.s;
                }
            }
            else {
                keymap = null;
            }
        } while (keymap);
        if (void 0 !== data) {
            var part = path[path.length - 1];
            if (part && part.km && part.km.v) {
                var point = part.km.v[part.v] || (part.mv && part.mv.keymap);
                if (point && (!point.r || point.r(pat, point.d))) {
                    delete point.d;
                }
            }
        }
    };
    // values can be verbatim, glob, or array of globs
    self.list = function (pat, exact) {
        pat = pat || {};
        function descend(keymap, match, missing, acc) {
            if (keymap.v) {
                var key = keymap.k;
                var gexval = (0, gex_1.Gex)(pat ? (null == pat[key] ? (exact ? null : '*') : pat[key]) : '*');
                var itermatch = { ...match };
                var itermissing = { ...missing };
                var nextkeymap;
                for (var val in keymap.v) {
                    if (val === pat[key] ||
                        (!exact && null == pat[key]) ||
                        gexval.on(val)) {
                        var valitermatch = { ...itermatch };
                        valitermatch[key] = val;
                        var valitermissing = { ...itermissing };
                        delete valitermissing[key];
                        nextkeymap = keymap.v[val];
                        if (0 === Object.keys(valitermissing).length &&
                            nextkeymap &&
                            nextkeymap.d) {
                            acc.push({
                                match: valitermatch,
                                data: nextkeymap.d,
                                find: nextkeymap.f,
                            });
                        }
                        if (nextkeymap && null != nextkeymap.v) {
                            descend(nextkeymap, { ...valitermatch }, { ...valitermissing }, acc);
                        }
                    }
                }
                nextkeymap = keymap.s;
                if (nextkeymap) {
                    descend(nextkeymap, { ...itermatch }, { ...itermissing }, acc);
                }
            }
        }
        var acc = [];
        if (top.d) {
            acc.push({
                match: {},
                data: top.d,
                find: top.f,
            });
        }
        descend(top, {}, { ...pat }, acc);
        return acc;
    };
    self.toString = function (first, second) {
        var tree = true === first ? true : !!second;
        var dstr = 'function' === typeof first
            ? first
            : function (d) {
                return 'function' === typeof d ? '<' + d.name + '>' : '<' + d + '>';
            };
        function indent(o, d) {
            for (var i = 0; i < d; i++) {
                o.push(' ');
            }
        }
        var str = [];
        function walk(n, o, d, vs) {
            var vsc;
            if (void 0 !== n.d) {
                o.push(' ' + dstr(n.d));
                str.push(vs.join(', ') + ' -> ' + dstr(n.d));
            }
            if (n.k) {
                o.push('\n');
                indent(o, d);
                o.push(n.k + ':');
            }
            if (n.v || n.s || n.g) {
                d++;
            }
            if (n.v) {
                // d++
                var pa = Object.keys(n.v).sort();
                for (var pi = 0; pi < pa.length; pi++) {
                    var p = pa[pi];
                    o.push('\n');
                    indent(o, d);
                    o.push(p + ' ->');
                    vsc = vs.slice();
                    vsc.push(n.k + '=' + p);
                    walk(n.v[p], o, d + 1, vsc);
                }
            }
            if (n.g) {
                var pa = Object.keys(n.g).sort();
                for (var pi = 0; pi < pa.length; pi++) {
                    var mvs = n.g[pa[pi]];
                    for (var mvi = 0; mvi < mvs.length; mvi++) {
                        var mv = mvs[mvi];
                        o.push('\n');
                        indent(o, d);
                        o.push(mv.fix + ' ~>');
                        vsc = vs.slice();
                        vsc.push(n.k + '~' + mv.fix);
                        walk(mv.keymap, o, d + 1, vsc);
                    }
                }
            }
            if (n.s) {
                o.push('\n');
                indent(o, d);
                o.push('|');
                vsc = vs.slice();
                walk(n.s, o, d + 1, vsc);
            }
        }
        var o = [];
        walk(top, o, 0, []);
        return tree ? o.join('') : str.join('\n');
    };
    self.inspect = self.toString;
    self.toJSON = function (indent) {
        return JSON.stringify(top, function (_key, val) {
            if ('function' === typeof val)
                return '[Function]';
            return val;
        }, indent);
    };
    return self;
}
exports.Patrun = Patrun;
function make(custom) {
    return new Patrun(custom);
}
if ('undefined' !== typeof module) {
    module.exports = make;
    module.exports.Patrun = Patrun;
    module.exports.Gex = gex_1.Gex;
}
exports.default = make;
//# sourceMappingURL=patrun.js.map