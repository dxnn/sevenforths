// this one gets more base words
// final logging/testing improvements

function f_four(str) {
  return ntrprt(parse(str))

  function ntrprt(program, stack, dict) {
    stack = stack || []
    
    if(!dict) {
      dict = {}
      dict['pick']  = function(stack) {p=stack.pop(); stack.push(stack[stack.length-p-1]); return stack}
      dict['roll']  = function(stack) {p=stack.pop(); x=stack[stack.length-p-1]; stack.splice(stack.length-p-1, 1); stack.push(x); return stack}

      addword('dup',  '0 pick', dict)
      addword('over', '1 pick', dict)
      addword('swap', '1 roll', dict)
      addword('rot',  '2 roll', dict)
      addword('tuck', 'swap 1 pick', dict)
      dict['drop'] = function(stack) {stack.pop(); return stack}

      var ops  = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>', '==']
      ops.forEach(function(op) {
        dict[op] = function(stack) {
          var top=stack.pop(); stack.push(eval(stack.pop() + op + top)); return stack } })
    }
    
    function eatword(dict, program, pc) {
      var stop = program.indexOf(';', pc)
      var name = program[pc+1]
      var sub = program.slice(pc+2, stop)
      addword(name, sub, dict)
      pc = stop
      return [dict, program, pc]
    }
    
    function addword(name, sub, dict) {
      if(typeof sub == 'string') sub = parse(sub)
      dict[name] = function(stack) {return ntrprt(sub, stack, dict)}
    }
    
    var pc = 0, max = program.length
    while(pc < max) {
      var word = program[pc]
      if(word == ':') {
        out = eatword(dict, program, pc)                  // use ES6 destructuring
        dict = out[0]
        program = out[1]
        pc = out[2]
      }
      else if(+word == word) 
        stack.push(+word)                                 // numbers go on the stack
      else 
        stack = dict[word](stack)                         // funs can be any arity
      pc++
    }
    return stack
  }

  function parse(str) {
    str = eatcomments(str)
    return str.split(/\s+/)
  }
  
  function eatcomments(str) {
    var arr = str.split('')
    var mode = 'add'
    return arr.reduce(function(acc, char) {
      if(char == '(') mode = 'paren'                      // TODO: count depth
      if(mode == 'add') acc += char
      if(char == ')') mode = 'add'
      return acc
    }, "")
  }
}


var test = function(str, res) {
  var error = console.error.bind(console)
  var log   = console.log.bind(console)
  var name = 'f_four'
  var fun  = name+'("'+str+'")'
  var out  = eval(fun)
  var say  = JSON.stringify(out) == JSON.stringify(res) ? log : error
  say(fun, out)
}

test("5.2 2 -", [3.2])                                    // decimals and subtraction are still fine
test("1 2 + 3 *", [9])                                    // interleaved operators are fine
test("3 4 drop dup *", [9])                               // keywords are still fine
test("3 : dd dup dup ; dd * *", [27])                     // new words!
test(": dd dup dup ; : ddd dd dup ; 3 ddd + + +", [12])   // new words in new words!
test(": triple 3 * ; 7 triple", [21])                     // note that defs are global and flat (not nested)

