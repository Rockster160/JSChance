class JsChance {
  constructor(text) {
    this.json = JsChance.textToJson(text)
    this.options = {}

    this.genFunctions()
  }

  static regx_square_brackets = /\[([^\[]*?)\]/ig

  static deepFind(obj, keys) {
    let found = obj
    keys.forEach(function(key) { found = found[key] })
    return found
  }

  static textToJson(text) {
    let lines = text.split("\n").filter(function(word) {
      return word.replace(/\/\/.*/ig, "").replace(/\s/ig, "").length > 0
    })

    let json = {}, current_obj = json, parents = [], prev_key = undefined, prev_indent = -1
    let regx_indent = new RegExp("  ", "g")

    lines.forEach(function(line) {
      let key = line.replace(/\/\/.*/ig, "").trim()
      let current_indent = line.match(/\s+/g)?.[0]?.match(regx_indent)?.length || 0

      if (current_indent > prev_indent) {
        if (prev_key) { parents.push(prev_key) }
        current_obj = current_obj[prev_key] || current_obj
      } else if (current_indent < prev_indent) {
        for (let i=0; i<(prev_indent - current_indent); i++) { parents.pop() }
        current_obj = JsChance.deepFind(json, parents)
      }

      current_obj[key] = {}
      prev_indent = current_indent
      prev_key = key
    })

    return json
  }

  static isInt(num) {
    return !Number.isNaN(Number(num))
  }

  static rand() {
    let args = Array.from(arguments)

    if (args.length == 0) {
      return Math.random()
    } else if (args.length == 1) {
      let arg = args[0]
      if (this.isInt(arg)) { // Check if an int
        return Math.floor(this.rand() * Number(arg)) // 0-int (exclude int)
      } else if (/\d+\-\d+/.test(arg)) { // Is a num range like 10-15
        let [num1, num2] = arg.split("-")
        return this.rand(num1, num2)
      } else if (typeof arg == "string" && arg.includes("|")) {
        return this.rand(...arg.split("|"))
      } else if (Array.isArray(arg)) {
        return this.rand(...arg)
      } else {
        throw("Not a valid argument: " + (typeof arg) + " (" + arg + ")")
      }
    } else if (args.length == 2 && this.isInt(args[0]) && this.isInt(args[1])) {
      // Num range like 10,15 inclusive
      let [min, max] = args.map(function(n) { return Number(n) })
      return Math.floor(this.rand() * (1 + max - min) + min)
    } else {
      return args[this.rand(args.length)]
    }
  }

  static parseText(text, parser) {
    let self = this

    while (this.isBracketWrapped(text)) {
      text = text.replace(/\[([^\[]*?)\]/ig, function(full, group1) {
        if (parser && typeof parser[group1] == "function") {
          return parser[group1]()
        } else {
          return self.rand(group1)
        }
      })
    }

    return text
  }

  static bracketWrappedRegX() {
    return /\[([^\[]*?)\]/i
  }

  static isBracketWrapped(str) {
    return this.bracketWrappedRegX().test(str)
  }

  branches() {
    return this.branchesFromJson(this.options)
  }

  branchesFromJson(json, parents) {
    json = json || this.json
    parents = parents || []
    let branches = []

    for (let [key, obj] of Object.entries(json)) {
      if (Object.keys(obj).length == 0) {
        branches.push([key])
      } else {
        branches = [...branches, ...this.branchesFromJson(obj, [key])]
      }
    }

    return branches.map(function(branch) {
      return [...parents, ...branch]
    })
  }

  collapseOptions(opts) {
    opts = opts || this.options
    for (let [key, vals] of Object.entries(opts)) {
      let collapsed = false
      if (JsChance.isBracketWrapped(key)) {
        let match_data = key.match(JsChance.bracketWrappedRegX())
        let calls = match_data[1].split(".")
        let dig = this.options
        calls.forEach(dig_key => {
          if (dig.hasOwnProperty(dig_key)) {
            dig = dig[dig_key]
          }
        })
        if (dig) {
          collapsed = true
          delete opts[key]
          this.branchesFromJson(dig).forEach(trunk => {
            let dug = opts
            trunk.forEach(branch => {
              dug[branch] = dug[branch] || {}
              dug = dug[branch]
            })
          })
        }
      }
      if (collapsed) {
        // If we collapsed, we might have another key that needs to be expanded, so try again
        this.collapseOptions(opts)
      }
      this.collapseOptions(vals)
    }
  }

  genFunction(fnName, json_options) {
    let self = this
    if (!fnName) { return }

    self.options[fnName] = json_options
    self[fnName] = function() {
      let opts = this.branchesFromJson(json_options)
      var option = opts[Math.floor(Math.random() * opts.length)]
      option[option.length-1] = self.constructor.parseText(option[option.length-1], self)

      return option.length <= 1 ? option[0] : option
    }
  }

  genFunctions() {
    for (let [key, opts] of Object.entries(this.json)) {
      this.genFunction(key, opts)
    }
    this.collapseOptions()
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JsChance;
}
