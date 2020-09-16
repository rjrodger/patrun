/* Copyright (c) 2020 Richard Rodger, MIT License */


// key : pattern element key name string
// fix : pattern element match value
// val : potential match value

const Gex = require('gex')


export interface Matcher {
  make(key: string, fix: any): MatchValue | undefined
}


export interface MatchValue {
  match(val: any): boolean
  kind: string
  val$?: any
}


export class GexMatcher implements Matcher {
  constructor() {

  }

  make(key: string, fix: any) {
    if ('string' === typeof fix && fix.match(/[*?]/)) {
      let gex = Gex(fix)
      return {
        kind: 'gex',
        match: (val: any) => null != gex.on(val),
      }
    }
    else return undefined
  }
}


// TODO: integers: <1, >1&<2, >2 is complete
// TODO: ranges: 1..3 is >=1&&<=3, [1,2) is >=1,<2
// TODO: any: * is -Inf>=&&<=+Inf
// TODO: non-Number types: special case
// TODO: range against other values can close gap: 10..20, 21..30 => [10,21)[21,30]
export class IntervalMatcher implements Matcher {
  kind = 'interval'

  constructor() {
  }


  #and = (lhs: any, rhs?: any) => function and(x: number) {
    return lhs(x) && rhs(x)
  }
  #or = (lhs: any, rhs?: any) => function or(x: number) {
    return lhs(x) || rhs(x)
  }
  #f = (n: any) => function f(x: any) { return false }
  #mgt = (n: number) => function gt(x: number) { return x > n }
  #mgte = (n: number) => function gte(x: number) { return x >= n }
  #mlt = (n: number) => function lt(x: number) { return x < n }
  #mlte = (n: number) => function lte(x: number) { return x <= n }

  make(key: string, fix: any) {
    if ('string' === typeof fix) {
      let m = fix.match(/^\s*([<>]=?)\s*([-+.0-9a-fA-FeEoOxX]+)(\s*(&+|\|+)\s*([<>]=?)\s*([-+.0-9a-fA-FeEoOxX]+))?\s*$/)

      if (null == m) {
        return undefined
      }

      let o0 =
        '<' === m[1] ? this.#mlt :
          '<=' === m[1] ? this.#mlte :
            '>' === m[1] ? this.#mgt :
              this.#mgte
      let n0 = Number(m[2])

      let jo = null == m[4] ? this.#or :
        '&' === m[4].substring(0, 1) ? this.#and : this.#or

      let o1 =
        null == m[5] ? this.#f :
          '<' === m[5] ? this.#mlt :
            '<=' === m[5] ? this.#mlte :
              '>' === m[5] ? this.#mgt :
                this.#mgte
      let n1 = null == m[6] ? null : Number(m[6])

      // console.log(jo(o0(n0), o1(n1)), o0(n0), o1(n1))
      let check = jo(o0(n0), o1(n1))

      return {
        kind: 'interval',
        match: (val: any) => {
          let res = false
          let n = parseFloat(val)

          if (!isNaN(n)) {
            res = check(n)
          }

          return res
        }
      }
    }
    else return undefined
  }
}
