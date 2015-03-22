function f_one(str) {
  return ntrprt(parse(str))
}

function ntrprt(program) {
  return program.reduce(function(stack, word) {
    if(+word == word) return stack.concat(word)           // numbers go on the stack
    stack.push(eval(stack.pop() + word + stack.pop()))    // ops are all binary
    return stack
  }, [])
}

function parse(str) {
  return str.split(/\s+/)
}

console.log('f_one("2 3 +")', f_one("2 3 +"))             // addition is fine
console.log('f_one("5 2 -")', f_one("5 2 -"))             // whoops this is backwards
console.log('f_one("1.23 3 +")', f_one("1.23 3 +"))       // decimals are fine
console.log('f_one("1 2 + 3 *")', f_one("1 2 + 3 *"))     // interleaved operators are fine