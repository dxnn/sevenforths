// full phase separation -- compile-time is distinct from run-time, and our compiled language is more like assembly
// repl-able: keep track of state and iteratively compile new input strings (and execute as needed)
// once we're past the compile-time program modifications the remaining program has no syntax errors (e.g. unbalanced compile-time matches). 
// if we return zero for stack underflows and bound our pc jumps then we have no runtime errors either
// commands to load to/from "memory"
// can we disassemble from compiled code back in to forth? how much info would we need to retain to get well-factored forth back? 

function f_five(str) {
  var rstack = []                                         // return stack
  var cstack = []                                         // compile-time stack
  var cdict = cdict_builder()                             // compile-time dictionary
  var  dict =  dict_builder()                             // run-time dictionary

  // the function body
  return ntrprt(compile(str))

  // helper functions
  function ntrprt(program, stack) {
    var pc = 0
    stack  = stack || []
    
    while(pc < program.length) {
      var word = program[pc]
      if(word == 'jump')
        pc = program[pc+1] - 1                            // - 1 to account for ++
      else if(word == 'jump-if-true')
        pc = stack.pop() ? program[pc+1] - 1 : pc+1       // + 1 to skip addr w/ ++
      else if(word == 'exit')                             // NOTE: stack, not rstack...
        pc = stack.pop() - 1                              // - 1 to account for ++
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
    dict[name] = function(stack) {return ntrprt(sub, stack)}
  }
  
  function compile(str) {                                 // str -> flat list of words
    return ctime(parse(str))
  }
  
  function parse(str) {                                   // str -> fancy list of words
    str = eatcomments(str)
    return str.trim().toLowerCase().split(/\s+/)
  }
  
  function ctime(program) {                               // fancy words -> flat words
    var pc = 0
    
    while(pc < program.length) {                          // because the program may grow
      var word = program[pc]
      if(cdict[word]) {
        var out = cdict[word](dict, program, pc)          // use ES6 destructuring
        dict = out[0]                                     // global... :/
        program = out[1]
        pc = out[2]
      } else {
        pc++
      }
    }
    
    return program
  }
  
  function eatcomments(str) {                             // str -> str
    var arr = str.split('')
    var mode = 'add'
    return arr.reduce(function(acc, char) {
      if(char == '(') mode = 'paren'                      // TODO: count depth
      if(mode == 'add') acc += char
      if(char == ')') mode = 'add'
      return acc
    }, "")
  }
  
  function dict_builder() {
    var dict = {}

    dict['abs']  = function(stack) {stack.push(Math.abs(stack.pop())); return stack}
    dict['max']  = function(stack) {stack.push(Math.max(stack.pop(), stack.pop())); return stack}
    dict['min']  = function(stack) {stack.push(Math.min(stack.pop(), stack.pop())); return stack}
    dict['not']  = function(stack) {stack.push(!stack.pop()); return stack}
    dict['drop'] = function(stack) {stack.pop(); return stack}
    dict['dump'] = function(stack) {console.log(stack); return stack}

    dict['pick']  = function(stack) {p=stack.pop(); stack.push(stack[stack.length-p-1]); return stack}
    dict['roll']  = function(stack) {p=stack.pop(); x=stack[stack.length-p-1]; stack.splice(stack.length-p-1, 1); stack.push(x); return stack}

    addword('dup',  '0 pick', dict)
    addword('over', '1 pick', dict)
    addword('swap', '1 roll', dict)
    addword('rot',  '2 roll', dict)
    addword('tuck', 'swap 1 pick', dict)

    dict['>r'] = function(stack) {rstack.push(stack[stack.length-1]); return stack} // global rstack... :/
    dict['@r'] = function(stack) {stack.push(rstack[rstack.length-1]); return stack}
    dict['r>'] = function(stack) {stack.push(rstack.pop()); return stack}

    var ops  = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>', '==']
    ops.forEach(function(op) {
      dict[op] = function(stack) {
        var top=stack.pop(); stack.push(eval(stack.pop() + op + top)); return stack } })
    
    return dict
  }
  
  function cdict_builder() {                              // compile-time words -- not user-extensible
    var cdict =      
      { ':' :
          function(dict, program, pc) {
            var name = program[pc+1]
            cstack.push([name, pc])
            program.splice(pc, 2)                         // remove the : and name
            return [dict, program, pc]
          }
      , ';' :
          function(dict, program, pc) {
            var out = cstack.pop()                        // ES6 destructuring
            var name = out[0]
            var start = out[1]
            var stop = pc
            var sub = program.slice(start, stop)
            program.splice(start, stop-start+1)
            addword(name, sub, dict)
            return [dict, program, start]
          }
      , 'begin' :
          function(dict, program, pc) {
            cstack.push(pc)
            program.splice(pc, 1)                         // remove the begin statement
            return [dict, program, pc]
          }
      , 'until' :
          function(dict, program, pc) {
            var addr = cstack.pop()
            program.splice(pc, 1, 'not', 'jump-if-true', addr) // note the lookahead for jump instruction
            return [dict, program, pc]
          }
      , 'while' :
          function(dict, program, pc) {
            var addr = cstack.pop()
            program.splice(pc, 1, 'jump-if-true', addr) // note the lookahead for jump instruction
            return [dict, program, pc]
          }
      , 'if' :
          function(dict, program, pc) {
            var nextthen = program.indexOf('then', pc) + 2 // +2 for the 'if' splice
            var nextelse = program.indexOf('else', pc) + 2
            if(nextelse == 1 || nextelse > nextthen)
              nextelse = 0
            nextthen += (nextelse ? 1 : 0)                 // +2 for the 'else' splice
            
            program.splice(pc, 1, 'not', 'jump-if-true', nextelse ? nextelse+2 : nextthen)
            if(nextelse)
              program.splice(nextelse, 1, 'jump', nextthen) 
            program.splice(nextthen, 1)
      
            return [dict, program, pc]
          }
      }
      
    return cdict
  }
}


var test = function(str, res) {
  var error = console.error.bind(console)
  var log   = console.log.bind(console)
  var name = 'f_five'
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

// via http://galileo.phys.virginia.edu/classes/551.jvn.fall01/primer.htm
test(': SQUARED   ( a -- a*a )     DUP *  ;   \
                                              \
      : SUM-OF-SQUARES   ( a b -- a*a+b*b )   \
          SQUARED          ( -- a b*b )       \
          SWAP             ( -- b*b a )       \
          SQUARED          ( -- b*b a*a )     \
          +                ( -- b*b + a*a )   \
      ;                                       \
                                              \
      5 7 SUM-OF-SQUARES                      \
', [74])

// via http://www.openbookproject.net/py4fun/forth/forth.html
test(': fact                             ( n --- n!  replace TOS with its factorial )  \
          0 swap                           ( place a zero below n )                    \
          begin dup 1 - dup  1 == until    ( make stack like 0 n ... 4 3 2 1 )         \
          begin * over       0 == until    ( multiply till see the zero below answer ) \
          swap drop                        ( delete the zero )                         \
      ;                                                                                \
                                                                                       \
      5 fact                                                                           \
', [120])

test(': countdown begin dup 1 - dup while drop ; 5 countdown', [5, 4, 3, 2, 1])
test('3 -4 abs max', [4])
test('3 4 min', [3])

test('0 if 4 else 9 then', [9])
test('5 if 4 else 9 then', [4])
test('1 if 9 then', [9])
test('0 if 9 then', [])

// via http://www.openbookproject.net/py4fun/forth/forth.html
test(': fact2                                                           \
          dup 1 > if         ( if 1 or 0 then leave on stack )          \
            dup 1 - fact2    ( next number down - get its factorial )   \
            * then           ( and multiply - leaving answer on stack ) \
      ;                                                                 \
                                                                        \
      5 fact2                                                           \
', [120])
