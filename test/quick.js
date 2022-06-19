const PatrunRoot = require('..')
const { Patrun } = require('..')

let p0 = PatrunRoot()
console.log(p0.inspect())

p0.add({ a: 1 }, 'x')
console.log(p0.inspect())

let p1 = Patrun()
console.log(p1.inspect())

p1.add({ a: 1 }, 'x')
console.log(p1.inspect())
