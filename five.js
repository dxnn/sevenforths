// full phase separation -- compile-time is distinct from run-time, and our compiled language is more like assembly
// repl-able: keep track of state and iteratively compile new input strings (and execute as needed)
// once we're past the compile-time program modifications the remaining program has no syntax errors (e.g. unbalanced compile-time matches). 
// if we return zero for stack underflows and bound our pc jumps then we have no runtime errors either
// commands to load to/from "memory"
// can we disassemble from compiled code back in to forth? how much info would we need to retain to get well-factored forth back? 
// TODO: get branching operations working for REPL entry (currently they only work for compiled words)

function f_five(err, out) {                               // create a new forth instance
  var pc     = 0                                          // program counter
  var codes  = [-0]                                       // compiled words
  var memory = []                                         // heap space
  var  stack = []                                         // param stack
  var rstack = []                                         // return stack
  var cstack = []                                         // compile-time stack
  var   dict = {}
  var  cdict = cdict_builder()                            // compile-time dictionary
                dict_builder()                            // run-time dictionary

  if(!err) {                                              // TODO: make this run-time overloadable
    err = function(info) {
      console.error(info)
    }
  }
  
  if(!out) {                                              // TODO: make this run-time overloadable
    out = function(info) {
      console.log(info)
    }
  }
  
  return ntrprt
  
  function ntrprt(str) {                                  // the forth interpreter
    var words = chunk(str)
    while(words.length) {
      eatword(words.shift())
    }
  }

  function eatword(word) {
    if(cdict[word])
      cdict[word]()                                       // compile-time words take precedence
    else if(cstack.length)
      rstack.push(word)                                   // if we're compiling, save the word
    else if(+word == word)
      stack.push(+word||0)                                // add numbers; block NaNs
    else if(dict[word]|0)
      dosub(dict[word])                                   // user-defined words go to code
    else if(dict[word])
      dict[word]()                                        // funs can use stack / rstack / pc etc
    else
      err("I don't understand " + word)
  }
  
  function dosub(num) {
    if(pc) rstack.push(pc+1)                              // return to the next instruction
    pc = num
    execute()
  }
  
  function execute() {
    while(pc && pc < codes.length) {
      var oldpc = pc
      eatword(codes[pc])
      if(pc && oldpc == pc) pc++                          // THINK: this will lead to subtle bugs
    }
  }
  
  function chunk(str) {                                   // str -> fancy list of words
    str = eatcomments(str)
    return str.trim().toLowerCase().split(/\s+/)
  }
  
  function eatcomments(str) {                             // TODO: add ( and ) to cdict
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
    dict['drop'] = function() {stack.pop()}
    dict['dump'] = function() {out(stack)}
    dict['emit'] = function() {out(stack.pop())}

    dict['pick'] = function() {p=stack.pop(); stack.push(stack[stack.length-p-1])}
    dict['roll'] = function() {p=stack.pop(); x=stack[stack.length-p-1]; stack.splice(stack.length-p-1, 1); stack.push(x)}

    dict['>r'  ] = function() {rstack.push(stack[stack.length-1])}
    dict['@r'  ] = function() {stack.push(rstack[rstack.length-1])}
    dict['r>'  ] = function() {stack.push(rstack.pop())}

    dict['exit'] = function() {pc = rstack.pop()|0}       // THINK: is this right?
    dict['branch'] = function() {pc = codes[pc+1]}        // THINK: is this right?
    dict['0branch'] = function() {pc = stack.pop() ? pc+2 : codes[pc+1]}

    dict['abs' ] = function() {stack.push(Math.abs(stack.pop()))}
    dict['max' ] = function() {stack.push(Math.max(stack.pop(), stack.pop()))}
    dict['min' ] = function() {stack.push(Math.min(stack.pop(), stack.pop()))}
    dict['not' ] = function() {stack.push(!stack.pop())}

    var ops  = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>', '==']
    ops.forEach(function(op) {
      dict[op] = function() {
        var top=stack.pop(); stack.push(eval(stack.pop() + op + top)) } })
    
    ntrprt(': dup 0 pick ;')
    ntrprt(': over 1 pick ;')
    ntrprt(': swap 1 roll ;')
    ntrprt(': rot 2 roll ;')
    ntrprt(': tuck swap 1 pick ;')    
  }
  
  function cdict_builder() {                              // compile-time words -- not user-extensible
    var cdict =                                           // at compile-time rstack is empty, so it
      { ':' :                                             // collects words for us
          function() {
            cstack.push('colon')
          }
      , ';' :
          function() {
            var label = cstack.pop()
            if(label != 'colon')
              return err('DANGER: unmatched ;')
            
            var name = rstack.shift()
            dict[name] = codes.length
            codes = codes.concat(uglyfix(rstack), 'exit')
            rstack = []
          }
      , 'begin' :
          function() {
            cstack.push(['begin', rstack.length])
          }
      , 'until' :
          function() {
            rstack.push('not')
            cdict['while']('until')
          }
      , 'while' :
          function(from) {
            var out = cstack.pop()                        // TODO: ES6 destructuring
            var label = out[0]
            var addr = out[1]
            if(label != 'begin')
              return err('DANGER: unmatched ' + (from||'while'))

            rstack.push('not', '0branch', addr)           // note the lookahead for jump instruction
          }
      , 'if' :
          function() {
            rstack.push('0branch', 0)                     // 0 is a placeholder address
            cstack.push(['if', rstack.length-1])          // note the placeholder address pointer
          }
      , 'else' :
          function() {
            var out = cstack.pop()                        // TODO: ES6 destructuring
            var label = out[0]
            var addr = out[1]
            if(label != 'if')
              return err('DANGER: unmatched if')
            
            rstack.push('branch', 0)                      // unconditional branch and new placeholder 
            rstack[addr] = rstack.length                  // set the old placeholder address
            cstack.push(['if', rstack.length-1])          // note the placeholder address pointer
          }
      , 'then' :
          function() {
            var out = cstack.pop()                        // TODO: ES6 destructuring
            var label = out[0]
            var addr = out[1]
            if(label != 'if')
              return err('DANGER: unmatched if')
            
            rstack[addr] = rstack.length                  // set the placeholder address
          }
      }
      
    return cdict
  }
  
  function uglyfix(list) {
    var offset = codes.length-1
    return list.map(function(item) {
      return +item===item ? item+offset : item
    })
  }
}


var test = function(str, res) {
  var output = 0
  var error = console.error.bind(console)
  var log   = console.log.bind(console)
  var out   = function(info) {output = info}
  var name = 'f_five'
  var fun  = name+'()("'+str+'")'
  window[name](error, out)(str+' dump')
  var say  = JSON.stringify(output) == JSON.stringify(res) ? log : error
  say(fun, output)
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

test(': yarg 0 if 4 else 9 then ; yarg', [9])
test(': yarg 5 if 4 else 9 then ; yarg', [4])
test(': yarg 1 if 9 then ; yarg', [9])
test(': yarg 0 if 9 then ; yarg', [])

// via http://www.openbookproject.net/py4fun/forth/forth.html
test(': fact2                                                           \
          dup 1 > if         ( if 1 or 0 then leave on stack )          \
            dup 1 - fact2    ( next number down - get its factorial )   \
            * then           ( and multiply - leaving answer on stack ) \
      ;                                                                 \
                                                                        \
      5 fact2                                                           \
', [120])
