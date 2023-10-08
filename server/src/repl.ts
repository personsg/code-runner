import path = require('path')
import * as repl from 'repl'
import * as vm from 'vm'
import { extractDependencies, replaceConstWithLet, stripDependencies } from './utils'

class Execute {
  public repl: repl.REPLServer
  public installed_modules: string[] = []
  public log: string[] = []

  constructor() {
    this.repl = repl.start({
      prompt: '',
      eval: (code: string, context: any, file: string, cb: any) => {
        this.replEvalCode(code)
      },
      ignoreUndefined: true,
      terminal: true,
      useColors: true,
      useGlobal: false,
    })

    this.repl.context.__dirname = process.cwd()
  }

  public async runCode(code: string): Promise<{ start: number; end: number; result: string }> {
    console.log(`Executing ${code}`)
    const start = Date.now()

    try {
      new vm.Script(code)
    } catch (ex: any) {
      const end = Date.now()
      return {
        start,
        end,
        result: `Fatal error - syntax error. ${ex}`,
      }
    }
    try {
      this.repl.context.__filename = path.join(process.cwd(), `__exec.js`)
      const result = await vm.runInNewContext(code, this.repl.context, {
        displayErrors: true,
        filename: undefined,
      })
      // delay 100ms
      await new Promise(resolve => setTimeout(resolve, 100))
      return {
        start,
        end: Date.now(),
        result: `Result:\n${formatResult(result)}`,
      }
    } catch (ex: any) {
      const end = Date.now()
      return {
        start,
        end,
        result: `Fatal error - runtime error. ${ex}`,
      }
    }
  }

  public async replEvalCode(code: string) {
    return this.runCode(code)
  }

  public async run(code: string): Promise<{ start: number; end: number; result: string }> {
    console.log(`Executing:\n${code}`)
    const start = Date.now()
    const code_deps = extractDependencies(code)
    const new_deps = code_deps.filter(dep => !this.installed_modules.includes(dep))
    const existing_deps = code_deps.filter(dep => this.installed_modules.includes(dep))
    const clean_deps = stripDependencies(code, existing_deps)
    const new_code = replaceConstWithLet(clean_deps)

    this.installed_modules = [...this.installed_modules, ...new_deps]

    this.log = []

    this.repl.context.__filename = path.join(process.cwd(), `__exec.js`)
    this.repl.context.display = {
      text: (text: string) => {
        console.log(text)
        return text
      },
      markdown: (markdown: string) => {
        console.log(markdown)
      },
      html: (html: string) => {
        console.log(html)
      },
      image: (image: string) => {
        console.log(image)
      },
    }

    this.repl.context.console = {
      log: (text: string) => {
        this.log.push(text)
      },
      error: (text: string) => {
        this.log.push(text)
      },
    }

    try {
      const result = await vm.runInNewContext(new_code, this.repl.context, {
        displayErrors: true,
        filename: undefined,
      })
      const end = Date.now()
      return {
        start,
        end,
        result: `Log:\n${this.log}\n\nResult:\n` + formatResult(result),
      }
    } catch (result) {
      const end = Date.now()

      return {
        start,
        end,
        result: result.toString(),
      }
    }
  }
}

function formatResult(result: any) {
  if (typeof result === 'object') {
    return JSON.stringify(result)
  } else {
    return String(result)
  }
}

export default Execute
