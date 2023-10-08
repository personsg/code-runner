import { ChatCompletionMessageParam } from 'openai/resources/chat'
import Execute from './repl'
import { DATA_PATH, clientSocket } from '.'
import * as fs from 'fs'
import { extractCode, llm, getSystemPrompt } from './llm'
import LTM, { Memory } from './ltm'
require('dotenv').config()

const config: Config = {
  family: 'local',
  model: 'codellama:13b-instruct'
}

export class Runner {
  private _goal: string = ''
  public messages: Message[] = []
  public repl: Execute
  public blocks: Block[] = []
  public config: Config
  public memory: LTM

  constructor() {
    this.repl = new Execute()
    this.config = config
    this.memory = new LTM()
  }

  public save() {
    const path = DATA_PATH
    if (!fs.existsSync(path)) {
      throw new Error(`Path ${path} does not exist`)
    }

    fs.writeFileSync(`${path}/goal.txt`, this.goal)
    fs.writeFileSync(`${path}/blocks.json`, JSON.stringify(this.blocks))
    fs.writeFileSync(`${path}/messages.json`, JSON.stringify(this.messages))
    fs.writeFileSync(`${path}/config.json`, JSON.stringify(this.config))
  }

  public async load() {
    const path = DATA_PATH
    console.log(path)
    if (fs.existsSync(path + '/goal.txt')) {
      this.goal = fs.readFileSync(`${path}/goal.txt`, 'utf8')
      this.blocks = JSON.parse(fs.readFileSync(`${path}/blocks.json`, 'utf8'))
      this.messages = JSON.parse(fs.readFileSync(`${path}/messages.json`, 'utf8'))
      this.config = JSON.parse(fs.readFileSync(`${path}/config.json`, 'utf8'))
    }

    await this.memory.load()
  }

  public async approveCodeBlock() {
    const lastBlock = this.blocks[this.blocks.length - 1]
    const codeBlock = this.blocks[this.blocks.length - 2]
    if (lastBlock.type === 'approval' && codeBlock.type === 'function_call') {
      lastBlock.status = 'approved'
      clientSocket.send(
        JSON.stringify({
          type: 'blocks',
          blocks: this.blocks,
        }),
      )

      try {
        const result = await this.repl.run(codeBlock.function_args.code)
        const res = result.result

        this.blocks.push({
          type: 'function_return',
          content: String(res),
        })
        this.messages.push({
          role: 'function',
          name: 'run_code',
          content: String(res) === '' ? 'No Output' : String(res),
        })
        this.save()

        clientSocket.send(
          JSON.stringify({
            type: 'blocks',
            blocks: this.blocks,
          }),
        )
        this.loop()
      } catch (e) {
        console.error(e)
      }
    }
  }

  public userResponse(message: string) {
    this.messages.push({
      role: 'user',
      content: message,
    })
    this.blocks.push({
      type: 'user',
      content: message,
    })
    // this.memory.addMemory({
    //   type: 'conversation',
    //   source: 'user',
    //   content: message,
    // })
    this.save()
    this.loop()
  }

  public async loop() {
    const lastMessage = this.messages[this.messages.length - 1]

    if (lastMessage.role === 'user') {
      // const memories = await this.memory.searchMemory(lastMessage.content)

      // const augmentedLastMessage = memories.length > 0 ? {
      //   ...lastMessage,
      //   content: `You recall the below memories from your past conversations:\n
      //   ${memories.map((m) => m.content).join('\n')}

      //   ${lastMessage.content}`
      // } : lastMessage

      // const conversation = [...this.messages.slice(0, this.messages.length - 1), augmentedLastMessage]

      const response = await llm(this.messages, this.config, clientSocket)

      // this.blocks.push({
      //   type: 'memory',
      //   content: memories
      // })

      this.messages.push(response)
      // this.memory.addMemory({
      //   type: 'conversation',
      //   source: 'agent',
      //   content: response.content,
      // })

      if (response.content) {
        this.blocks.push({
          type: 'assistant',
          content: response.content,
        })
      }

      if (response.function_call) {
        this.blocks.push({
          type: 'function_call',
          function_name: response.function_call.name,
          function_args: {
            language: 'javascript',
            code: extractCode(response.function_call.arguments, this.config),
          },
        })
        this.blocks.push({
          type: 'approval',
          content: 'Do you want to run this code?',
          status: 'new',
        })
      }

      clientSocket.send(
        JSON.stringify({
          type: 'blocks',
          blocks: this.blocks,
        }),
      )
      this.save()
      return this.loop()
    }

    if (lastMessage.role === 'function') {
      const responseRaw = await llm(this.messages, this.config, clientSocket)

      let response = responseRaw

      if (response.content) {
        this.blocks.push({
          type: 'assistant',
          content: response.content,
        })
        this.messages.push(responseRaw)
      }

      if (response.function_call) {
        this.blocks.push({
          type: 'function_call',
          function_name: response.function_call.name,
          function_args: {
            language: 'javascript',
            code: extractCode(response.function_call.arguments, this.config),
          },
        })
        this.blocks.push({
          type: 'approval',
          content: 'Do you want to run this code?',
          status: 'new',
        })
      }

      this.save()
      clientSocket.send(
        JSON.stringify({
          type: 'blocks',
          blocks: this.blocks,
        }),
      )
      return
    }
  }

  public async generateInitialPlan() {
    const messages: Message[] = [
      {
        role: 'system',
        content: getSystemPrompt(this.config),
      },
      {
        role: 'user',
        content: this.goal,
      },
    ]

    this.messages = messages

    const response = await llm(messages, this.config, clientSocket)

    if (response.content) {
      this.blocks.push({
        type: 'assistant',
        content: response.content,
      })
      this.messages.push(response)
      // this.memory.addMemory({
      //   type: 'conversation',
      //   source: 'agent',
      //   content: response.content,
      // })
    }

    if (response.function_call) {
      this.blocks.push({
        type: 'function_call',
        function_name: response.function_call.name,
        function_args: {
          language: 'javascript',
          code: extractCode(response.function_call.arguments, this.config),
        },
      })
      this.blocks.push({
        type: 'approval',
        content: 'Do you want to run this code?',
        status: 'new',
      })
    }

    clientSocket.send(
      JSON.stringify({
        type: 'blocks',
        blocks: this.blocks,
      }),
    )
    this.save()
  }

  public get goal(): string {
    return this._goal
  }

  public set goal(value: string) {
    this._goal = value

    this.blocks.push({
      type: 'goal',
      content: value,
    })
  }
}

export type Message = ChatCompletionMessageParam

type BlockGoal = {
  type: 'goal'
  content: string
}

type BlockUser = {
  type: 'user'
  content: string
}

type BlockAssistant = {
  type: 'assistant'
  content: string
}

type BlockFunctionCall = {
  type: 'function_call'
  function_name: string
  function_args: {
    language: string
    code: string
  }
}

type BlockFunctionReturn = {
  type: 'function_return'
  content: string
}

type BlockApproval = {
  type: 'approval'
  content: string
  status: 'new' | 'approved' | 'rejected'
}

type BlockMemory = {
  type: 'memory'
  content: Memory[]
}

export type Block =
  | BlockUser
  | BlockAssistant
  | BlockFunctionCall
  | BlockApproval
  | BlockGoal
  | BlockFunctionReturn
  | BlockMemory

export type Config = {
  family: "local" | "openai"
  model: string
}
