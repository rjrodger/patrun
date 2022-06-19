const Patrun = require('..')

let p0 = Patrun()
console.log(p0.inspect())

p0.add({ a: 1 }, 'x')
console.log(p0.inspect())
