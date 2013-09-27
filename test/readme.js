
var patrun = require('..')

var pm = patrun()
      .add({a:1},'A')
      .add({b:2},'B')

// prints A
console.log( pm.find({a:1}) ) 

// prints null
console.log( pm.find({a:2}) ) 

// prints A, b:1 is ignored, it was never registered
console.log( pm.find({a:1,b:1}) ) 

// prints B, c:3 is ignored, it was never registered
console.log( pm.find({b:2,c:3}) ) 



// queries return a function, in case there is some
// really custom logic (and there is, see US, NY below)
// in the normal case, just pass the rate back out with
// an identity function
// also record the rate for custom printing later
function I(val) { var rate = function(){return val}; rate.val=val; return rate }

var salestax = patrun()
salestax
  .add({}, I(0.0) )

  .add({ country:'IE' }, I(0.25) )
  .add({ country:'UK' }, I(0.20) )
  .add({ country:'DE' }, I(0.19) )

  .add({ country:'IE', type:'reduced' }, I(0.135) )
  .add({ country:'IE', type:'food' },    I(0.048) )

  .add({ country:'UK', type:'food' },    I(0.0) )

  .add({ country:'DE', type:'reduced' }, I(0.07) )

  .add({ country:'US' }, I(0.0) ) // no federeal rate (yet!)

  .add({ country:'US', state:'AL' }, I(0.04) ) 
  .add({ country:'US', state:'AL', city:'Montgomery' }, I(0.10) ) 

  .add({ country:'US', state:'NY' }, I(0.07) ) 
  .add({ country:'US', state:'NY', type:'reduced' }, function under110(net){
    return net < 110 ? 0.0 : salestax.find( {country:'US', state:'NY'} )
  }) 



console.log('Default rate: ' + 
            salestax.find({})(99) )

console.log('Standard rate in Ireland on E99: ' + 
            salestax.find({country:'IE'})(99) )

console.log('Food rate in Ireland on E99:     ' + 
            salestax.find({country:'IE',type:'food'})(99) )

console.log('Reduced rate in Germany on E99:  ' + 
            salestax.find({country:'IE',type:'reduced'})(99) )

console.log('Standard rate in Alabama on $99: ' + 
            salestax.find({country:'US',state:'AL'})(99) )

console.log('Standard rate in Montgomery, Alabama on $99: ' + 
            salestax.find({country:'US',state:'AL',city:'Montgomery'})(99) )

console.log('Reduced rate in New York for clothes on $99: ' + 
            salestax.find({country:'US',state:'NY',type:'reduced'})(99) )


// prints:
// Default rate: 0
// Standard rate in Ireland on E99: 0.25
// Food rate in Ireland on E99:     0.048
// Reduced rate in Germany on E99:  0.135
// Standard rate in Alabama on $99: 0.04
// Standard rate in Montgomery, Alabama on $99: 0.1
// Reduced rate in New York for clothes on $99: 0


// print out decision tree
console.log(salestax.toString(function(f){return f.name+':'+f.val}))



pm = patrun()
  .add({a:1,b:1},'B1')
  .add({a:1,b:2},'B2')

// finds nothing: []
console.log( pm.findall({a:1}) )

// finds:
// [ { match: { a: '1', b: '1' }, data: 'B1' },
//   { match: { a: '1', b: '2' }, data: 'B2' } ]
console.log( pm.findall({a:1,b:'*'}) )
