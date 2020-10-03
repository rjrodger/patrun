"use strict";
/* Copyright (c) 2020 Richard Rodger, MIT License */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _and, _or, _nil, _err, _mgt, _mgte, _mlt, _mlte, _meq;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalMatcher = exports.GexMatcher = void 0;
// key : pattern element key name string
// fix : pattern element match value
// val : potential match value
const Gex = require('gex');
class GexMatcher {
    constructor() {
    }
    make(key, fix) {
        if ('string' === typeof fix && fix.match(/[*?]/)) {
            let gex = Gex(fix);
            return {
                kind: 'gex',
                match: (val) => null != gex.on(val),
                fix: fix,
                meta: {}
            };
        }
        else
            return undefined;
    }
    complete(mvs, opts) {
        return {
            ok: mvs.filter(mv => '*' === mv.fix).length > 0,
            gaps: [],
            why: 'no-star'
        };
    }
}
exports.GexMatcher = GexMatcher;
// TODO: integers: <1, >1&<2, >2 is complete
// TODO: any: * is -Inf>=&&<=+Inf \ intervals - ie. gaps
// TODO: non-Number types: special case
// NOTE: '/' == '\\'
const IntervalRE = new RegExp([
    '^/s*',
    '(=*[<>/(/[]?=*)?' + // lenient operator symbol
        '/s*' + // optional whitespace
        '([-+0-9a-fA-FeEoOxX]+(x(y))?)' + // (/.([0-9a-fA-FeEoOxX]+))?)' + // number
        '(' + // start optional second term
        '/s*(,|&+|/|+|/./.)' + // join
        '/s*' + // optional whitespace
        '(=*[<>]?=*)' + // lenient operator symbol
        '/s*' + // optional whitespace
        '([-+.0-9a-fA-FeEoOxX]+)' + // number
        '/s*' + // optional whitespace
        '([/)/]]?)' + // lenient operator symbol
        ')?' + // end optional second term
        '/s*$',
].join('').replace(/\//g, '\\'));
class IntervalMatcher {
    constructor() {
        this.kind = 'interval';
        _and.set(this, (lhs, rhs) => function and(x) {
            return lhs(x) && rhs(x);
        });
        _or.set(this, (lhs, rhs) => function or(x) {
            return lhs(x) || rhs(x);
        });
        _nil.set(this, (n) => function nil(x) { return false; });
        _err.set(this, (n) => function err(x) { return false; });
        _mgt.set(this, (n) => function gt(x) { return x > n; });
        _mgte.set(this, (n) => function gte(x) { return x >= n; });
        _mlt.set(this, (n) => function lt(x) { return x < n; });
        _mlte.set(this, (n) => function lte(x) { return x <= n; });
        _meq.set(this, (n) => function eq(x) { return x === n; });
    }
    make(key, fix) {
        if ('string' === typeof fix) {
            let m = fix.match(IntervalRE);
            let meta = { jo: 'and', o0: 'err', n0: NaN, o1: 'err', n1: NaN };
            let match = (val) => false;
            if (null != m) {
                // standalone number
                if (null == m[1] && !isNaN(Number(fix))) {
                    m = [fix, '=', fix];
                }
                let os0 = IntervalMatcher.normop(m[1]);
                //let os1 = IntervalMatcher.normop(m[5]) || IntervalMatcher.normop(m[7])
                let os1 = IntervalMatcher.normop(m[7]) || IntervalMatcher.normop(m[9]);
                let o0 = '=' === os0 ? __classPrivateFieldGet(this, _meq) :
                    '<' === os0 ? __classPrivateFieldGet(this, _mlt) :
                        '<=' === os0 ? __classPrivateFieldGet(this, _mlte) :
                            '>' === os0 ? __classPrivateFieldGet(this, _mgt) :
                                '(' === os0 ? __classPrivateFieldGet(this, _mgt) :
                                    '>=' === os0 ? __classPrivateFieldGet(this, _mgte) :
                                        '[' === os0 ? __classPrivateFieldGet(this, _mgte) : __classPrivateFieldGet(this, _err);
                let n0 = Number(m[2]);
                //let n1 = null == m[6] ? NaN : Number(m[6])
                let n1 = null == m[8] ? NaN : Number(m[8]);
                let jos = m[6];
                let jo = null == jos ? __classPrivateFieldGet(this, _or) :
                    '&' === jos.substring(0, 1) ? __classPrivateFieldGet(this, _and) :
                        ',' === jos.substring(0, 1) ? __classPrivateFieldGet(this, _and) : __classPrivateFieldGet(this, _or);
                if ('..' === jos) {
                    jo = __classPrivateFieldGet(this, _and);
                    o0 = __classPrivateFieldGet(this, _err) === o0 ? __classPrivateFieldGet(this, _mgte) : o0;
                    os1 = null == os1 || '' === os1 ? '<=' : os1;
                }
                let o1 = null == os1 ? __classPrivateFieldGet(this, _nil) :
                    '=' === os1 ? __classPrivateFieldGet(this, _mlt) :
                        '<' === os1 ? __classPrivateFieldGet(this, _mlt) :
                            ')' === os1 ? __classPrivateFieldGet(this, _mlt) :
                                '<=' === os1 ? __classPrivateFieldGet(this, _mlte) :
                                    ']' === os1 ? __classPrivateFieldGet(this, _mlte) :
                                        '>' === os1 ? __classPrivateFieldGet(this, _mgt) :
                                            '>=' === os1 ? __classPrivateFieldGet(this, _mgte) : __classPrivateFieldGet(this, _err);
                // console.log(jo(o0(n0), o1(n1)), o0(n0), o1(n1))
                // if one sided interval, add the other side out to infinity
                if (__classPrivateFieldGet(this, _err) !== o0) {
                    if (__classPrivateFieldGet(this, _nil) === o1) {
                        if (__classPrivateFieldGet(this, _mlt) === o0 || __classPrivateFieldGet(this, _mlte) === o0) {
                            o1 = o0;
                            n1 = n0;
                            o0 = __classPrivateFieldGet(this, _mgte);
                            n0 = Number.NEGATIVE_INFINITY;
                            jo = __classPrivateFieldGet(this, _and);
                        }
                        else if (__classPrivateFieldGet(this, _mgt) === o0 || __classPrivateFieldGet(this, _mgte) === o0) {
                            o1 = __classPrivateFieldGet(this, _mlte);
                            n1 = Number.POSITIVE_INFINITY;
                            jo = __classPrivateFieldGet(this, _and);
                        }
                        // else this.meq ok as is
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
            }
            return {
                kind: 'interval',
                fix,
                meta,
                match
            };
        }
    }
    complete(mvs, opts) {
        let completion = {
            ok: false,
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
                        c.upper = h;
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
                // hn > un by previous sorting
                else {
                    if (hlt || hlte) {
                        // console.log('OL-b', c, h)
                        /*
                        // overlap matches boundaries of c.upper.n..h.n
                        c.overs.push([
                          { n: un, o: c.upper.o, m: 8 },
                          { n: hn, o: h.o, m: 9 }
                        ])
                        */
                        c.upper = h;
                    }
                    else if (ueq || ult || ulte) {
                        // {un,hn}
                        c.gaps.push([
                            { n: un, o: (ueq || ulte) ? 'gt' : 'gte', m: 4 },
                            { n: hn, o: (heq || hgte) ? 'lt' : 'lte', m: 5 }
                        ]);
                    }
                }
            }
            return c;
        }, completion);
        let last = 0 < half_intervals.length && half_intervals[half_intervals.length - 1];
        // {n,+oo]
        if (last && top !== last.n && last.o !== 'gt' && last.o !== 'gte') {
            completion.gaps.push([
                { n: last.n, o: (last.o === 'eq' || last.o === 'lte') ? 'gt' : 'gte', m: 6 },
                { n: top, o: 'lte', m: 7 }
            ]);
        }
        completion.ok = 0 === completion.gaps.length;
        return completion;
    }
    half_intervals(mvs) {
        let half_intervals = [];
        for (let mv of mvs) {
            half_intervals.push([{ n: mv.meta.n0, o: mv.meta.o0 },
                { n: mv.meta.n1, o: mv.meta.o1 }]);
        }
        return half_intervals
            .map(hh => [
            (isNaN(hh[0].n) || null == hh[0].n) ? null : hh[0],
            (isNaN(hh[1].n) || null == hh[1].n) ? null : hh[1]
        ]
            .filter(h => null != h))
            .sort((a, b) => a[0].n < b[0].n ? -1 : b[0].n < a[0].n ? 1 :
            a[0].o.includes('l') && b[0].o.includes('g') ? -1 :
                a[0].o.includes('g') && b[0].o.includes('l') ? 1 :
                    a[0].o.includes('t') && !b[0].o.includes('t') ? -1 :
                        !a[0].o.includes('t') && b[0].o.includes('t') ? 1 :
                            0)
            .reduce((hv, hh) => hv.concat(...hh), []);
    }
}
exports.IntervalMatcher = IntervalMatcher;
_and = new WeakMap(), _or = new WeakMap(), _nil = new WeakMap(), _err = new WeakMap(), _mgt = new WeakMap(), _mgte = new WeakMap(), _mlt = new WeakMap(), _mlte = new WeakMap(), _meq = new WeakMap();
// == sames as =, <= same as =<
IntervalMatcher.normop = (op) => null == op ? null :
    (((op.match(/([<>\(\)\[\]])/) || [])[1] || '') + ((op.match(/(=)/) || [])[1] || ''));
//# sourceMappingURL=matchers.js.map