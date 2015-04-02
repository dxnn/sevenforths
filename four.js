// this one gets more base words
// final logging/testing improvements

// TODO: add branching/conditional/looping functions; more math functions; variadic tests?; 


function f_four(str) {
  var cstack = []  // control stack
  var cdict =      // compile-time words -- note that these are not user-extensible
  { ':' :
        function(dict, program, pc) {
          var stop = program.indexOf(';', pc)
          var name = program[pc+1]
          var sub = program.slice(pc+2, stop)
          addword(name, sub, dict)
          pc = stop
          return [dict, program, pc]
        }
  , 'begin' :
        function(dict, program, pc) {
          cstack.push(pc)
          program.splice(pc, 1) // remove the begin statement
          return [dict, program, pc-1]
        }
  , 'until' :
        function(dict, program, pc) {
          var addr = cstack.pop()
          program.splice(pc, 1, 'not', 'jump-if-true', addr) // note the lookahead for jump instruction
          return [dict, program, pc-1]
        }
  }

  // the function body
  return ntrprt(parse(str))

  // helper functions
  function ntrprt(program, stack, dict) {
    stack = stack || []
    
    if(!dict) { // default dict
      dict = {}

      dict['not']   = function(stack) {stack.push(!stack.pop()); return stack}

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
    
    var pc = 0
    while(pc < program.length) {
      var word = program[pc]
      if(cdict[word]) {
        out = cdict[word](dict, program, pc)              // use ES6 destructuring
        dict = out[0]
        program = out[1]
        pc = out[2]
      }
      else if(word == 'jump-if-true')
        pc = stack.pop() ? program[pc+1] - 1 : pc+1
      else if(+word == word) 
        stack.push(+word)                                 // numbers go on the stack
      else 
        stack = dict[word](stack)                         // funs can be any arity
      pc++
    }
    return stack
  }

  function addword(name, sub, dict) {
    if(typeof sub == 'string') sub = parse(sub)
    dict[name] = function(stack) {return ntrprt(sub, stack, dict)}
  }
  
  function parse(str) {
    str = eatcomments(str)
    return str.trim().toLowerCase().split(/\s+/)
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
  var out  = window[name](str)
  var say  = JSON.stringify(out) == JSON.stringify(res) ? log : error
  say(fun, out)
}

test("5.2 2 -", [3.2])                                    // decimals and subtraction are still fine
test("1 2 + 3 *", [9])                                    // interleaved operators are fine
test("3 4 drop dup *", [9])                               // keywords are still fine
test("3 : dd dup dup ; dd * *", [27])                     // new words!
test(": dd dup dup ; : ddd dd dup ; 3 ddd + + +", [12])   // new words in new words!
test(": triple 3 * ; 7 triple", [21])                     // note that defs are global and flat (not nested)

test("2 5 73 -16 2 roll", [2, 73, -16, 5])
test("2 5 73 -16 3 pick", [2, 5, 73, -16, 2])
test("2 5 73 -16 tuck", [2, 5, -16, 73, -16])
test("5 2 ( asdf 123 ) -", [3])
test(': SQUARED   ( a -- a*a )     DUP *  ;   \
                                              \
      : SUM-OF-SQUARES   ( a b -- a*a+b*b )   \
           SQUARED           ( -- a b*b)      \
           SWAP              ( -- b*b a)      \
           SQUARED           ( -- b*b a*a)    \
           +                 ( -- b*b + a*a)  \
      ;                                       \
                                              \
      5 7 SUM-OF-SQUARES                      \
', [74])
test(': fact                             (  n --- n!  replace TOS with its factorial ) \
        0 swap                           ( place a zero below n )                      \
        begin dup 1 - dup  1 == until    ( make stack like 0 n ... 4 3 2 1 )           \
        begin * over       0 == until    ( multiply till see the zero below answer )   \
        swap drop                        ( delete the zero )                           \
      ;                                                                                \
                                                                                       \
      5 fact                                                                           \
', [120])
