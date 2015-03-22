function ntrprt(program) {
  return program.reduce(function(stack, word) {
    if(+word == word) return stack.concat(word)        // numbers go on the stack
    stack.push(eval(stack.pop() + word + stack.pop())) // ops are all binary
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