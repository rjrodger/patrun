"use strict";
/* Copyright (c) 2013-2022 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gex = void 0;
exports.Patrun = Patrun;
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
    // Every key used by a pattern, so that find can tell how many of a
    // subject's keys could ever be matched.
    var keyset = Object.create(null);
    // A pattern key that names an inherited property (such as `constructor`)
    // can be read from a subject that does not have it.
    var oddkeys = false;
    // The number of pairs in the longest pattern: no match can have more.
    var maxpairs = 0;
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
            keyset[key] = true;
            oddkeys = oddkeys || key in Object.prototype;
        });
        maxpairs = Math.max(maxpairs, keys.length);
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
    // Find the data of the most specific pattern that matches the subject:
    // the one with the most key/value pairs. Patterns with equally many pairs
    // are ranked by their keys in alphabetical order, then by an exact value
    // over a matcher, then by the order in which the matchers were added.
    //
    // Each step down the tree matches one more pair, so the depth of a node is
    // the number of pairs in its pattern. The search is depth first, in ranking
    // order, and keeps the first of the deepest nodes that hold data. Every
    // branch that the subject matches is a candidate, not only the first.
    self.find = function (pat, exact, collect) {
        if (null == pat)
            return null;
        if (exact && collect)
            return trail(pat);
        var subkeys = Object.keys(pat);
        var patlen = subkeys.length;
        var collection = [];
        // The most specific match so far, and the number of pairs it matched.
        var best = null;
        var bestdepth = -1;
        // The most pairs the current path can end up with. A key can match once,
        // and only at its place in the key order, so each key of the subject that
        // a path passes over lowers this. A path that cannot beat the best match
        // so far is not followed. This relies on the subject's own keys being
        // the only ones that can match, which is true of a plain object.
        var limit = Infinity;
        if (!exact && !collect && !oddkeys) {
            var proto = Object.getPrototypeOf(pat);
            if (Object.prototype === proto || null === proto) {
                limit = 0;
                for (var ki = 0; ki < patlen; ki++) {
                    if (true === keyset[subkeys[ki]])
                        limit++;
                }
            }
        }
        var keymap = null;
        var alt = 0; // next alternative at keymap: 0 is the exact value, then matchers
        var depth = 0; // pairs matched on the current path
        var pending = []; // untried alternatives: keymap, alt, depth, limit
        var node = top; // the node just reached; the root matches any subject
        while (true) {
            if (node) {
                if (void 0 !== node.d) {
                    if (collect) {
                        collection.push(node.d);
                    }
                    if (null != node.d && (exact ? depth === patlen : bestdepth < depth)) {
                        best = node;
                        bestdepth = depth;
                        // No pattern has more pairs than this.
                        if (exact || (!collect && maxpairs <= depth))
                            break;
                    }
                }
                keymap = node;
                alt = 0;
                node = null;
            }
            // Follow the keys at this point, in order, to the next that matches.
            while (keymap && keymap.v && depth < limit && bestdepth < limit) {
                var key = keymap.k;
                var val = pat[key];
                if (void 0 !== val) {
                    var ga = keymap.g && keymap.g[key];
                    var galen = ga ? ga.length : 0;
                    // Matching operation is either string equality (by prop lookup)
                    // or a matcher, such as gex.
                    if (0 === alt) {
                        node = keymap.v[val];
                        alt = 1;
                    }
                    while (!node && alt <= galen) {
                        if (ga[alt - 1].match(val)) {
                            node = ga[alt - 1].keymap;
                        }
                        alt++;
                    }
                    if (node) {
                        // Still to try from here: the other matchers for this key, and
                        // then the patterns that do not have this key (the star trail).
                        if (alt <= galen) {
                            pending.push(keymap, alt, depth, limit);
                        }
                        else if (keymap.s && !exact) {
                            pending.push(keymap.s, 0, depth, limit - 1);
                        }
                        break;
                    }
                    // The subject has this key, but nothing here matches its value.
                    // An exact match is now impossible. Otherwise follow the star
                    // trail, with one less key that could match.
                    if (exact)
                        break;
                    limit--;
                }
                keymap = keymap.s;
                alt = 0;
            }
            if (node) {
                depth++;
                continue;
            }
            // Dead end: go back to the latest untried alternative.
            if (0 === pending.length)
                break;
            limit = pending.pop();
            depth = pending.pop();
            alt = pending.pop();
            keymap = pending.pop();
        }
        if (collect)
            return collection;
        var data = null == best ? null : best.d;
        if (null != best && best.f) {
            data = best.f.call(self, pat, data);
        }
        return data;
    };
    // The data along the first trail through the tree that the subject
    // matches, widest first. At each key only the first value or matcher that
    // matches is taken, and patterns without that key are tried only if the
    // trail ends without data. This is find with both exact and collect.
    function trail(pat) {
        var keymap = top;
        var data = void 0 === top.d ? null : top.d;
        var stars = [];
        var collection = [];
        if (void 0 !== top.d) {
            collection.push(top.d);
        }
        do {
            var key = keymap.k;
            if (keymap.v) {
                var val = pat[key];
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
                    if (keymap.s) {
                        stars.push(keymap.s);
                    }
                    data = void 0 === nextkeymap.d ? null : nextkeymap.d;
                    if (void 0 !== nextkeymap.d) {
                        collection.push(nextkeymap.d);
                    }
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
            if (null == keymap && 0 < stars.length && null == data) {
                keymap = stars.pop();
            }
        } while (keymap);
        return collection;
    }
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