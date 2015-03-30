function f_two(str) {
  return ntrprt(parse(str))

  function ntrprt(program) {
    var ops  = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>']
    var doop = function(stack, word) {var top=stack.pop(); return stack.pop() + word + top}
    
    var dup  = function(stack) {return stack.concat(stack[stack.length-1])}
    var drop = function(stack) {stack.pop(); return stack}
    var swap = function(stack) {stack.push(stack.pop(), stack.pop()); return stack}
  
    return program.reduce(function(stack, word) {
      if(+word == word) return stack.concat(word)                   // numbers go on the stack
      if(~ops.indexOf(word))
        stack.push(eval(doop(stack, word)))                         // flip orientation of ops
      else 
        stack = eval(word+'('+JSON.stringify(stack)+')')            // funs can be any arity
      return stack
    }, [])
  }

  function parse(str) {
    return str.split(/\s+/)
  }
}


var i, name = 'f_two'
console.log(i = name+'("2 3 +")', eval(i))                          // addition is still fine
console.log(i = name+'("5 2 -")', eval(i))                          // subtraction is fine now too
console.log(i = name+'("1.23 3 +")', eval(i))                       // decimals are fine
console.log(i = name+'("1 2 + 3 *")', eval(i))                      // interleaved operators are still fine

console.log(i = name+'("3 dup dup * *")', eval(i))                  // keywords work now
console.log(i = name+'("3 4 5 drop drop dup dup * *")', eval(i))    // dropin' and dupin'
console.log(i = name+'("2 5 swap -")', eval(i))                     // hot swap
