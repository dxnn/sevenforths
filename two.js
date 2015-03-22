function ntrprt(program) {
  var ops = ['+', '*', '-', '/', '%', '^', '|', '&', '||', '&&', '<', '>', '<<', '>>']
  var dup = function(stack) {return stack.concat(stack[stack.length-1])}
  
  return program.reduce(function(stack, word) {
    if(+word == word) return stack.concat(word)                  // numbers go on the stack
    if(~ops.indexOf(word))
      stack.push(eval(stack.pop() + word + stack.pop()))         // ops are all binary
    else 
      stack = eval(word+'('+JSON.stringify(stack)+')')           // funs are binary too
    return stack
  }, [])
}

function parse(str) {
  return str.split(/\s+/)
}

function f(str) {
  return ntrprt(parse(str))
}

// f('1.12332 2 3 + 4 7 % ^ *')