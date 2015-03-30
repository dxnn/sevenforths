// this one gets : foo x y z ; form for adding words to the dictionary
// plus some better logging

function f_three(str) {
  return ntrprt(parse(str))

  function ntrprt(program, stack, dict) {
    stack = stack || []
    
    if(!dict) {      
      dict = {}
      dict['dup']  = function(stack) {stack.push(stack[stack.length-1]); return stack}
      dict['drop'] = function(stack) {stack.pop(); return stack}
      dict['swap'] = function(stack) {stack.push(stack.pop(), stack.pop()); return stack}

      var ops  = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>']
      ops.forEach(function(op) {
        dict[op] = function(stack) {
          var top=stack.pop(); stack.push(eval(stack.pop() + op + top)); return stack } })
    }
    
    function addword(dict, program, pc) {
      var stop = program.indexOf(';', pc)
      var name = program[pc+1]
      var sub = program.slice(pc+2, stop)
      dict[name] = function(stack) {return ntrprt(sub, stack, dict)}
      pc = stop
      return [dict, program, pc]
    }
    
    var pc = 0, max = program.length
    while(pc < max) {
      var word = program[pc]
      if(word == ':') {
        out = addword(dict, program, pc)                  // use ES6 destructuring
        dict = out[0]
        program = out[1]
        pc = out[2]
      }
      else if(+word == word) 
        stack.push(word)                                  // numbers go on the stack
      else 
        stack = dict[word](stack)                         // funs can be any arity
      pc++
    }
    return stack
  }

  function parse(str) {
    return str.split(/\s+/)
  }
}


var test = function(str, res) {
  var error = console.error.bind(console)
  var log   = console.log.bind(console)
  var name = 'f_three'
  var fun  = name+'("'+str+'")'
  var out  = eval(fun)
  var say  = JSON.stringify(out) == JSON.stringify(res) ? log : error
  say(fun, out)
}

test("2 3 +", [5])                                        // addition is still fine
test("5 2 -", [3])                                        // subtraction is fine now too
test("1.23 3 +", [4.23])                                  // decimals are fine
test("1 2 + 3 *", [9])                                    // interleaved operators are still fine
test("3 4 drop dup *", [9])                               // keywords are still fine
test("2 5 swap -", [3])                                   // hot swap

test("3 : dd dup dup ; dd * *", [27])                     // new words!
test(": dd dup dup ; : ddd dd dup ; 3 ddd + + +", [12])   // new words in new words!
test(": triple 3 * ; 7 triple", [21])                     // note that defs are global and flat (not nested)
