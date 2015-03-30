// this one gets : foo x y z ; form for adding words to the dictionary
// plus some better logging

function f_three(str) {
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


var str, name = 'f_three'
var log = console.log.bind(console)
var error = console.error.bind(console)
var test = function(str, res) {
  var fun = name+'("'+str+'")'
  var out = eval(fun)
  var say = JSON.stringify(out) == JSON.stringify(res) ? log : error
  say(fun, out)
}

test("2 3 +", [5])                                                  // addition is still fine
test("5 2 -", [3])                                                  // subtraction is fine now too
test("1.23 3 +", [4.23])                                            // decimals are fine
test("1 2 + 3 *", [9])                                              // interleaved operators are still fine
test("3 4 drop dup *", [9])                                         // keywords are still fine
test("2 5 swap -", [3])                                             // hot swap
