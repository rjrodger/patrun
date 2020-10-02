/* Copyright (c) 2020 Richard Rodger, MIT License */


// key : pattern element key name string
// fix : pattern element match value
// val : potential match value

const Gex = require('gex')


export interface Matcher {
  make(key: string, fix: any): MatchValue | undefined
  complete(mvs: MatchValue[], opts?: any): Completion
}

export interface Completion {
  ok: boolean,
  gaps: any[],
  why?: string
}


export interface MatchValue {
  match(val: any): boolean
  kind: string
  fix: any
  meta: any
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
        fix: fix,
        meta: {}
      }
    }
    else return undefined
  }

  complete(mvs: MatchValue[], opts?: any) {
    return {
      ok: mvs.filter(mv => '*' === mv.fix).length > 0,
      gaps: [],
      why: 'no-star'
    }
  }
}


// TODO: integers: <1, >1&<2, >2 is complete
// TODO: any: * is -Inf>=&&<=+Inf \ intervals - ie. gaps
// TODO: non-Number types: special case

// NOTE: '/' == '\\'
const IntervalRE = new RegExp([
  '^/s*', // optional whitespace
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
  '/s*$', // optional whitespace
].join('').replace(/\//g, '\\'))


export class IntervalMatcher implements Matcher {
  kind = 'interval'

  constructor() {
  }

  // == sames as =, <= same as =<
  static normop = (op: string) => null == op ? null :
    (((op.match(/([<>\(\)\[\]])/) || [])[1] || '') + ((op.match(/(=)/) || [])[1] || ''))


  #and = (lhs: any, rhs?: any) => function and(x: number) {
    return lhs(x) && rhs(x)
  }
  #or = (lhs: any, rhs?: any) => function or(x: number) {
    return lhs(x) || rhs(x)
  }
  #nil = (n: any) => function nil(x: any) { return false }
  #err = (n: any) => function err(x: any) { return false }
  #mgt = (n: any) => function gt(x: any) { return x > n }
  #mgte = (n: any) => function gte(x: any) { return x >= n }
  #mlt = (n: any) => function lt(x: any) { return x < n }
  #mlte = (n: any) => function lte(x: any) { return x <= n }
  #meq = (n: any) => function eq(x: any) { return x === n }


  make(key: string, fix: any) {
    if ('string' === typeof fix) {
      let m = fix.match(IntervalRE)
      let meta = { jo: 'and', o0: 'err', n0: NaN, o1: 'err', n1: NaN }
      let match = (val: any) => false

      if (null != m) {

        // standalone number
        if (null == m[1] && !isNaN(Number(fix))) {
          m = [fix, '=', fix]
        }


        let os0 = IntervalMatcher.normop(m[1])
        //let os1 = IntervalMatcher.normop(m[5]) || IntervalMatcher.normop(m[7])
        let os1 = IntervalMatcher.normop(m[7]) || IntervalMatcher.normop(m[9])

        let o0 =
          '=' === os0 ? this.#meq :
            '<' === os0 ? this.#mlt :
              '<=' === os0 ? this.#mlte :
                '>' === os0 ? this.#mgt :
                  '(' === os0 ? this.#mgt :
                    '>=' === os0 ? this.#mgte :
                      '[' === os0 ? this.#mgte :
                        this.#err

        let n0 = Number(m[2])
        //let n1 = null == m[6] ? NaN : Number(m[6])
        let n1 = null == m[8] ? NaN : Number(m[8])

        let jos = m[6]

        let jo = null == jos ? this.#or :
          '&' === jos.substring(0, 1) ? this.#and :
            ',' === jos.substring(0, 1) ? this.#and :
              this.#or

        if ('..' === jos) {
          jo = this.#and
          o0 = this.#err === o0 ? this.#mgte : o0
          os1 = null == os1 || '' === os1 ? '<=' : os1
        }

        let o1 =
          null == os1 ? this.#nil :
            '=' === os1 ? this.#mlt :
              '<' === os1 ? this.#mlt :
                ')' === os1 ? this.#mlt :
                  '<=' === os1 ? this.#mlte :
                    ']' === os1 ? this.#mlte :
                      '>' === os1 ? this.#mgt :
                        '>=' === os1 ? this.#mgte :
                          this.#err


        // console.log(jo(o0(n0), o1(n1)), o0(n0), o1(n1))
        let o0f = o0(n0)
        let o1f = o1(n1)
        let check = jo(o0f, o1f)

        meta = { jo: check.name, o0: o0f.name, n0, o1: o1f.name, n1 }
        match = (val: any) => {
          let res = false
          let n = parseFloat(val)

          if (!isNaN(n)) {
            res = check(n)
          }

          return res
        }
      }

      return {
        kind: 'interval',
        fix,
        meta,
        match
      }
    }
  }

  complete(mvs: MatchValue[], opts?: any) {
    let completion = {
      ok: false,
      gaps: [] as any[],
      lower: null,
      upper: null,
    }

    let bottom = Number.NEGATIVE_INFINITY
    let top = Number.POSITIVE_INFINITY

    let half_intervals: any[] = this.half_intervals(mvs)

    half_intervals
      .reduce((c, h) => {
        let heq = 'eq' === h.o
        let hlt = 'lt' === h.o
        let hlte = 'lte' === h.o
        let hgt = 'gt' === h.o
        let hgte = 'gte' === h.o
        let hn = h.n

        // NOTE: { == (or[or none

        if (null == c.lower) {
          let b = { n: bottom, o: 'gte' }
          c.lower = b
          c.upper = h

          if (hgt || hgte) {
            // {-oo,hn}
            c.gaps.push([b, { n: hn, o: hgt ? 'lte' : 'lt', m: 0 }])
          }
          else if (heq && bottom !== hn) {
            // {-oo,hn)
            c.gaps.push([b, { n: hn, o: 'lte', m: 1 }])
          }
        }
        else {
          let ueq = 'eq' === c.upper.o
          let ult = 'lt' === c.upper.o
          let ulte = 'lte' === c.upper.o
          let ugt = 'gt' === c.upper.o
          let ugte = 'hgte' === c.upper.o
          let un = c.upper.n
          let u = c.upper

          if (hn === un) {
            // un)[hn} OR {un](hn
            if ((ult && (hgte || heq)) ||
              ((ulte || ueq) && hgt)) {
              c.upper = h
            }
            else if (ueq || ult || ulte) {
              // {un,hn}
              c.gaps.push([
                { n: un, o: (ueq || ulte) ? 'gt' : 'gte', m: 2, d: { u, h } },
                { n: hn, o: (heq || hgte) ? 'lt' : 'lte', m: 3 }
              ])
            }
            // TODO overlaps
          }

          // hn > un by previous sorting
          else {
            if (hlt || hlte) {
              c.upper = h
              // TODO: overlaps
            }
            else {
              // {un,hn}
              c.gaps.push([
                { n: un, o: (ueq || ulte) ? 'gt' : 'gte', m: 4 },
                { n: hn, o: (heq || hgte) ? 'lt' : 'lte', m: 5 }
              ])
            }
          }
        }

        return c
      }, completion)



    let last = 0 < half_intervals.length && half_intervals[half_intervals.length - 1]
    // {n,+oo]
    if (last && last.o !== 'gt' && last.o !== 'gte') {
      completion.gaps.push([
        { n: last.n, o: (last.o === 'eq' || last.o === 'lte') ? 'gt' : 'gte', m: 6 },
        { n: top, o: 'lte', m: 7 }
      ])
    }

    completion.ok = 0 === completion.gaps.length

    return completion
  }


  half_intervals(mvs: MatchValue[]) {
    let half_intervals: any[] = []
    for (let mv of mvs) {
      half_intervals.push(
        [{ n: mv.meta.n0, o: mv.meta.o0 },
        { n: mv.meta.n1, o: mv.meta.o1 }]
      )
    }

    return half_intervals
      .map(hh => [
        (isNaN(hh[0].n) || null == hh[0].n) ? null : hh[0],
        (isNaN(hh[1].n) || null == hh[1].n) ? null : hh[1]]
        .filter(h => null != h))

      .sort((a, b) =>
        a[0].n < b[0].n ? -1 : b[0].n < a[0].n ? 1 :
          a[0].o.includes('l') && b[0].o.includes('g') ? -1 :
            a[0].o.includes('g') && b[0].o.includes('l') ? 1 :
              a[0].o.includes('t') && !b[0].o.includes('t') ? -1 :
                !a[0].o.includes('t') && b[0].o.includes('t') ? 1 :
                  0)

      .reduce((hv, hh) => hv.concat(...hh), [])
  }
}
