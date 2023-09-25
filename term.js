// node jschance/term.js
const JsChance = require('./jschance.js');

let parser = new JsChance(`
shapes
  general
    rod
    plate
    gear

  solids
    [shapes.general]
    block
    dust

  gems
    [shapes.solids]
    shard
    gem

  metals
    [shapes.solids]
    nugget
    ingot

  radioactives
    [shapes.metals]
    something
`)
// console.log(parser.shapes());
// console.log(parser.options);
console.log(parser.branches());
