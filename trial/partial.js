var Patrun = require('..')

var p1 = Patrun()
p1.add({ a: 0 }, 'P')
p1.add({ a:0, b: 1, c: 2 }, 'Q')

console.log(p1.toString(true))
console.dir(p1.top(),{depth:null})

console.log('a:0', p1.find({a:0}))
console.log('a:0,b:1', p1.find({a:0,b:1}))
console.log('a:0,b:1,c:2', p1.find({a:0,b:1,c:2}))

p1.add({ a:0, b: 1, c: 2, d: 3, e: 4 }, 'S')

console.log(p1.toString(true))
console.dir(p1.top(),{depth:null})

console.log('a:0', p1.find({a:0}))
console.log('a:0,b:1', p1.find({a:0,b:1}))
console.log('a:0,b:1,c:2', p1.find({a:0,b:1,c:2}))
console.log('a:0,b:1,c:2,d:3', p1.find({a:0,b:1,c:2,d:3}))
console.log('a:0,b:1,c:2,d:3,e:4', p1.find({a:0,b:1,c:2,d:3,e:4}))
