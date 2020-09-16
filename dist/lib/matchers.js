"use strict";
/* Copyright (c) 2020 Richard Rodger, MIT License */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _and, _or, _f, _mgt, _mgte, _mlt, _mlte;
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
            };
        }
        else
            return undefined;
    }
}
exports.GexMatcher = GexMatcher;
// TODO: integers: <1, >1&<2, >2 is complete
// TODO: ranges: 1..3 is >=1&&<=3, [1,2) is >=1,<2
// TODO: any: * is -Inf>=&&<=+Inf
// TODO: non-Number types: special case
// TODO: range against other values can close gap: 10..20, 21..30 => [10,21)[21,30]
class IntervalMatcher {
    constructor() {
        this.kind = 'interval';
        _and.set(this, (lhs, rhs) => function and(x) {
            return lhs(x) && rhs(x);
        });
        _or.set(this, (lhs, rhs) => function or(x) {
            return lhs(x) || rhs(x);
        });
        _f.set(this, (n) => function f(x) { return false; });
        _mgt.set(this, (n) => function gt(x) { return x > n; });
        _mgte.set(this, (n) => function gte(x) { return x >= n; });
        _mlt.set(this, (n) => function lt(x) { return x < n; });
        _mlte.set(this, (n) => function lte(x) { return x <= n; });
    }
    make(key, fix) {
        if ('string' === typeof fix) {
            let m = fix.match(/^\s*([<>]=?)\s*([-+.0-9a-fA-FeEoOxX]+)(\s*(&+|\|+)\s*([<>]=?)\s*([-+.0-9a-fA-FeEoOxX]+))?\s*$/);
            if (null == m) {
                return undefined;
            }
            let o0 = '<' === m[1] ? __classPrivateFieldGet(this, _mlt) :
                '<=' === m[1] ? __classPrivateFieldGet(this, _mlte) :
                    '>' === m[1] ? __classPrivateFieldGet(this, _mgt) : __classPrivateFieldGet(this, _mgte);
            let n0 = Number(m[2]);
            let jo = null == m[4] ? __classPrivateFieldGet(this, _or) :
                '&' === m[4].substring(0, 1) ? __classPrivateFieldGet(this, _and) : __classPrivateFieldGet(this, _or);
            let o1 = null == m[5] ? __classPrivateFieldGet(this, _f) :
                '<' === m[5] ? __classPrivateFieldGet(this, _mlt) :
                    '<=' === m[5] ? __classPrivateFieldGet(this, _mlte) :
                        '>' === m[5] ? __classPrivateFieldGet(this, _mgt) : __classPrivateFieldGet(this, _mgte);
            let n1 = null == m[6] ? null : Number(m[6]);
            // console.log(jo(o0(n0), o1(n1)), o0(n0), o1(n1))
            let check = jo(o0(n0), o1(n1));
            return {
                kind: 'interval',
                match: (val) => {
                    let res = false;
                    let n = parseFloat(val);
                    if (!isNaN(n)) {
                        res = check(n);
                    }
                    return res;
                }
            };
        }
        else
            return undefined;
    }
}
exports.IntervalMatcher = IntervalMatcher;
_and = new WeakMap(), _or = new WeakMap(), _f = new WeakMap(), _mgt = new WeakMap(), _mgte = new WeakMap(), _mlt = new WeakMap(), _mlte = new WeakMap();
//# sourceMappingURL=matchers.js.map