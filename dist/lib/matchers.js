"use strict";
/* Copyright (c) 2020 Richard Rodger, MIT License */
/* $lab:coverage:off$ */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _IntervalMatcher_and, _IntervalMatcher_or, _IntervalMatcher_nil, _IntervalMatcher_err, _IntervalMatcher_mgt, _IntervalMatcher_mgte, _IntervalMatcher_mlt, _IntervalMatcher_mlte, _IntervalMatcher_meq;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalMatcher = exports.GexMatcher = void 0;
const gex_1 = require("gex");
class GexMatcher {
    constructor() {
    }
    make(key, fix) {
        if ('string' === typeof fix && fix.match(/[*?]/)) {
            let gex = (0, gex_1.Gex)(fix);
            return {
                kind: 'gex',
                match: (val) => null != gex.on(val),
                fix: fix,
                meta: {},
                same(mv) {
                    return null != mv && mv.kind === this.kind && mv.fix === this.fix;
                }
            };
        }
        else
            return undefined;
    }
    // TODO: pretty primitive, just looks for '*'
    scan(mvs, opts) {
        let has_match_any = mvs.filter(mv => '*' === mv.fix).length > 0;
        return {
            complete: has_match_any,
            sound: has_match_any,
            gaps: [],
            overs: [],
            why: 'no-star'
        };
    }
}
exports.GexMatcher = GexMatcher;
// TODO: space joins with &
// TODO: recongnize 'and' 'or'
// TODO: integers: <1, >1&<2, >2 is complete
// TODO: any: * is -Inf>=&&<=+Inf \ intervals - ie. gaps
// TODO: non-Number types: special case
// NOTE: '/' == '\\'
const IntervalRE = new RegExp([
    '^/s*',
    '(=*[<>/(/[]?=*)?' + // 1, lenient operator symbol
        '/s*' + // optional whitespace
        '([-+0-9a-fA-FeEoOxX]+(/.([0-9a-fA-FeEoOxX]+))?)' + // 2,3,4 number
        '([/)/]]?)' + // 5, optional interval operator symbol
        '(' + // 6, start optional second term
        '/s*(,|&+|/|+|/./.)' + // 7, join
        '/s*' + // optional whitespace
        '(=*[<>]?=*)' + // 8, lenient operator symbol
        '/s*' + // optional whitespace
        '([-+.0-9a-fA-FeEoOxX]+)' + // 9, number
        '/s*' + // optional whitespace
        '([/)/]]?)' + // 10, interval operator symbol
        ')?' + // end optional second term
        '/s*$', // optional whitespace
].join('').replace(/\//g, '\\'));
class IntervalMatcher {
    constructor() {
        this.kind = 'interval';
        _IntervalMatcher_and.set(this, (lhs, rhs) => function and(x) {
            return lhs(x) && rhs(x);
        });
        _IntervalMatcher_or.set(this, (lhs, rhs) => function or(x) {
            return lhs(x) || rhs(x);
        });
        _IntervalMatcher_nil.set(this, (n) => function nil(x) { return false; });
        _IntervalMatcher_err.set(this, (n) => function err(x) { return false; });
        _IntervalMatcher_mgt.set(this, (n) => function gt(x) { return x > n; });
        _IntervalMatcher_mgte.set(this, (n) => function gte(x) { return x >= n; });
        _IntervalMatcher_mlt.set(this, (n) => function lt(x) { return x < n; });
        _IntervalMatcher_mlte.set(this, (n) => function lte(x) { return x <= n; });
        _IntervalMatcher_meq.set(this, (n) => function eq(x) { return x === n; });
    }
    make(key, fix) {
        if ('string' === typeof fix &&
            // At least one interval operator is required.
            // Exact numbers must be specified as '=X'
            fix.match(/[=<>.[()\]]/)) {
            let m = fix.match(IntervalRE);
            let meta = { jo: 'and', o0: 'err', n0: NaN, o1: 'err', n1: NaN };
            let match = (val) => false;
            if (null != m) {
                let os0 = IntervalMatcher.normop(m[1]) || IntervalMatcher.normop(m[5]);
                let os1 = IntervalMatcher.normop(m[8]) || IntervalMatcher.normop(m[10]);
                let o0 = '=' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_meq, "f") :
                    '<' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mlt, "f") :
                        ')' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mlt, "f") :
                            '<=' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f") :
                                ']' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f") :
                                    '>' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mgt, "f") :
                                        '(' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mgt, "f") :
                                            '>=' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f") :
                                                '[' === os0 ? __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f") :
                                                    __classPrivateFieldGet(this, _IntervalMatcher_err, "f");
                let n0 = Number(m[2]);
                let n1 = null == m[9] ? NaN : Number(m[9]);
                let jos = m[7];
                let jo = null == jos ? __classPrivateFieldGet(this, _IntervalMatcher_or, "f") :
                    '&' === jos.substring(0, 1) ? __classPrivateFieldGet(this, _IntervalMatcher_and, "f") :
                        ',' === jos.substring(0, 1) ? __classPrivateFieldGet(this, _IntervalMatcher_and, "f") :
                            __classPrivateFieldGet(this, _IntervalMatcher_or, "f");
                if ('..' === jos) {
                    jo = __classPrivateFieldGet(this, _IntervalMatcher_and, "f");
                    o0 = __classPrivateFieldGet(this, _IntervalMatcher_err, "f") === o0 ? __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f") : o0;
                    os1 = '' === os1 ? '<=' : os1;
                }
                let o1 = null == os1 ? __classPrivateFieldGet(this, _IntervalMatcher_nil, "f") :
                    '=' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_meq, "f") :
                        '<' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mlt, "f") :
                            ')' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mlt, "f") :
                                '<=' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f") :
                                    ']' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f") :
                                        '>' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mgt, "f") :
                                            '>=' === os1 ? __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f") :
                                                __classPrivateFieldGet(this, _IntervalMatcher_err, "f");
                // merge ops if same number
                if (n0 === n1) {
                    if ('=' === os0 && null != os1) {
                        n1 = NaN;
                        o1 = __classPrivateFieldGet(this, _IntervalMatcher_nil, "f");
                        if (os1.includes('<')) {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f");
                        }
                        else if (os1.includes('>')) {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f");
                        }
                        else if (os1.includes('=')) {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_meq, "f");
                        }
                        else {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_err, "f");
                        }
                    }
                    else if ('=' === os1 && null != os0) {
                        n1 = NaN;
                        o1 = __classPrivateFieldGet(this, _IntervalMatcher_nil, "f");
                        if (os0.includes('<')) {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f");
                        }
                        else if (os0.includes('>')) {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f");
                        }
                        else {
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_err, "f");
                        }
                    }
                }
                // console.log(jo(o0(n0), o1(n1)), o0(n0), o1(n1))
                // if one sided interval, add the other side out to infinity
                if (__classPrivateFieldGet(this, _IntervalMatcher_err, "f") !== o0) {
                    if (__classPrivateFieldGet(this, _IntervalMatcher_nil, "f") === o1) {
                        if (__classPrivateFieldGet(this, _IntervalMatcher_mlt, "f") === o0 || __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f") === o0) {
                            o1 = o0;
                            n1 = n0;
                            o0 = __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f");
                            n0 = Number.NEGATIVE_INFINITY;
                            jo = __classPrivateFieldGet(this, _IntervalMatcher_and, "f");
                        }
                        else if (__classPrivateFieldGet(this, _IntervalMatcher_mgt, "f") === o0 || __classPrivateFieldGet(this, _IntervalMatcher_mgte, "f") === o0) {
                            o1 = __classPrivateFieldGet(this, _IntervalMatcher_mlte, "f");
                            n1 = Number.POSITIVE_INFINITY;
                            jo = __classPrivateFieldGet(this, _IntervalMatcher_and, "f");
                        }
                        // else this.meq ok as is
                    }
                }
                // lower bound is always first so that interval sorting will work
                if (!isNaN(n1) && n1 < n0) {
                    let to = o1;
                    let tn = n1;
                    n1 = n0;
                    n0 = tn;
                    // sensible heuristic: 20..10 means >=10&<=20
                    if ('..' !== jos) {
                        o1 = o0;
                        o0 = to;
                    }
                }
                let o0f = o0(n0);
                let o1f = o1(n1);
                let check = jo(o0f, o1f);
                meta = { jo: check.name, o0: o0f.name, n0, o1: o1f.name, n1 };
                match = (val) => {
                    let res = false;
                    let n = parseFloat(val);
                    if (!isNaN(n)) {
                        res = check(n);
                    }
                    return res;
                };
                return {
                    kind: 'interval',
                    fix,
                    meta,
                    match,
                    same(mv) {
                        return null != mv &&
                            mv.kind === this.kind &&
                            mv.meta.jo === this.meta.jo &&
                            mv.meta.o0 === this.meta.o0 &&
                            mv.meta.n0 === this.meta.n0 &&
                            mv.meta.o1 === this.meta.o1 &&
                            mv.meta.n1 === this.meta.n1;
                    }
                };
            }
        }
    }
    scan(mvs, opts) {
        let scanres = {
            complete: false,
            sound: false,
            gaps: [],
            overs: [],
            lower: null,
            upper: null,
        };
        let bottom = Number.NEGATIVE_INFINITY;
        let top = Number.POSITIVE_INFINITY;
        let half_intervals = this.half_intervals(mvs);
        // console.log('H', half_intervals)
        half_intervals
            .reduce((c, h) => {
            // c: accumulated state
            // h: current half interval
            // console.log('\n\nRED')
            // console.dir(c, { depth: null })
            // console.dir(h, { depth: null })
            let heq = 'eq' === h.o;
            let hlt = 'lt' === h.o;
            let hlte = 'lte' === h.o;
            let hgt = 'gt' === h.o;
            let hgte = 'gte' === h.o;
            let hn = h.n;
            // NOTE: { == (or[or none
            if (null == c.lower) {
                let b = { n: bottom, o: 'gte' };
                c.lower = b;
                c.upper = h;
                if (!(bottom == hn && hgte)) {
                    if (hgt || hgte) {
                        // {-oo,hn}
                        c.gaps.push([b, { n: hn, o: hgt ? 'lte' : 'lt', m: 0 }]);
                    }
                    else if (heq) {
                        // {-oo,hn)
                        c.gaps.push([b, { n: hn, o: 'lte', m: 1 }]);
                    }
                }
            }
            else {
                let ueq = 'eq' === c.upper.o;
                let ult = 'lt' === c.upper.o;
                let ulte = 'lte' === c.upper.o;
                let ugt = 'gt' === c.upper.o;
                let ugte = 'hgte' === c.upper.o;
                let un = c.upper.n;
                let u = c.upper;
                if (hn === un) {
                    // un)[hn} OR {un](hn
                    if ((ult && (hgte || heq)) ||
                        ((ulte || ueq) && hgt)) {
                        //c.upper = h
                    }
                    else if (ueq || ult || ulte) {
                        // {un,hn}
                        c.gaps.push([
                            { n: un, o: (ueq || ulte) ? 'gt' : 'gte', m: 2, d: { u, h } },
                            { n: hn, o: (heq || hgte) ? 'lt' : 'lte', m: 3 }
                        ]);
                    }
                    else {
                        // TODO overlaps
                        // console.log('OL-a', c, h)
                    }
                }
                else if (un < hn) {
                    if (hlt || hlte) {
                        // console.log('OL-b', c, h)
                        /*
                        // overlap matches boundaries of c.upper.n..h.n
                        c.overs.push([
                          { n: un, o: c.upper.o, m: 8 },
                          { n: hn, o: h.o, m: 9 }
                        ])
                        */
                        //c.upper = h
                    }
                    else if (ueq || ult || ulte) {
                        // {un,hn}
                        c.gaps.push([
                            { n: un, o: (ueq || ulte) ? 'gt' : 'gte', m: 4 },
                            { n: hn, o: (heq || hgte) ? 'lt' : 'lte', m: 5 }
                        ]);
                    }
                }
                // hn < un
                else {
                    // console.log('hn < un', hn, un)
                    c.overs.push([
                        { n: hn, o: (heq || hgte) ? 'gte' : 'gt', m: 10 },
                        { n: un, o: (ueq || ulte) ? 'lte' : 'lt', m: 11 },
                    ]);
                }
                c.upper = h;
            }
            return c;
        }, scanres);
        let last = 0 < half_intervals.length && half_intervals[half_intervals.length - 1];
        // {n,+oo]
        if (last && top !== last.n && last.o !== 'gt' && last.o !== 'gte') {
            scanres.gaps.push([
                { n: last.n, o: (last.o === 'eq' || last.o === 'lte') ? 'gt' : 'gte', m: 6 },
                { n: top, o: 'lte', m: 7 }
            ]);
        }
        scanres.complete = 0 === scanres.gaps.length;
        scanres.sound = 0 === scanres.overs.length;
        return scanres;
    }
    // NOTE: assumes n0<=n1
    half_intervals(mvs) {
        let half_intervals = [];
        for (let mv of mvs) {
            half_intervals.push([{ n: mv.meta.n0, o: mv.meta.o0 },
                { n: mv.meta.n1, o: mv.meta.o1 }]);
        }
        // canonical ordering of operations
        var os = ['lt', 'lte', 'eq', 'gte', 'gt'];
        var hi = half_intervals
            .map(hh => [
            (isNaN(hh[0].n) || null == hh[0].n) ? null : hh[0],
            (isNaN(hh[1].n) || null == hh[1].n) ? null : hh[1]
        ]
            .filter(h => null != h))
            // sorting on intervals, *not* half intervals
            .sort((a, b) => {
            // sort by first term numerically
            if (a[0].n < b[0].n) {
                return -1;
            }
            else if (b[0].n < a[0].n) {
                return 1;
            }
            else {
                // sort by first term operationally
                var a0i = os.indexOf(a[0].o);
                var b0i = os.indexOf(b[0].o);
                if (a0i < b0i) {
                    return -1;
                }
                else if (b0i < a0i) {
                    return 1;
                }
                else {
                    // sort by second term numerically
                    if (a[1].n < b[1].n) {
                        return -1;
                    }
                    else if (b[1].n < a[1].n) {
                        return 1;
                    }
                    else {
                        // sort by second term operationally
                        var a1i = os.indexOf(a[1].o);
                        var b1i = os.indexOf(b[1].o);
                        return a1i < b1i ? -1 : b1i < a1i ? 1 : 0;
                    }
                }
            }
        })
            .reduce((hv, hh) => hv.concat(...hh), []);
        // console.log(hi)
        return hi;
    }
}
exports.IntervalMatcher = IntervalMatcher;
_IntervalMatcher_and = new WeakMap(), _IntervalMatcher_or = new WeakMap(), _IntervalMatcher_nil = new WeakMap(), _IntervalMatcher_err = new WeakMap(), _IntervalMatcher_mgt = new WeakMap(), _IntervalMatcher_mgte = new WeakMap(), _IntervalMatcher_mlt = new WeakMap(), _IntervalMatcher_mlte = new WeakMap(), _IntervalMatcher_meq = new WeakMap();
// == sames as =, <= same as =<
IntervalMatcher.normop = (op) => null == op ? null :
    (((op.match(/([<>\(\)\[\]])/) || [])[1] || '') + ((op.match(/(=)/) || [])[1] || ''));
//# sourceMappingURL=matchers.js.map