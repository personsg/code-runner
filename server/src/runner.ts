import { ChatCompletionMessageParam } from 'openai/resources/chat'
import Execute from './repl'
import { EXECUTION_PATH, RUNNER_MODEL, STATE_PATH, clientSocket } from '.'
import * as fs from 'fs'
import { extractCode, llm, getSystemPrompt } from './llm/llm'
import LTM, { Memory } from './memory/ltm'
import * as crypto from 'crypto'
import * as path from 'path'
require('dotenv').config()

const default_config: Config = {
  family: 'local',
  model: "codellama:13b-instruct",
  system_prompt: 'code-runner',
}

export class Runner {
  private _goal: string = ''
  public messages: Message[] = []
  public repl: Execute
  public blocks: Block[] = []
  private config: Config
  public memory: LTM
  public chat_id: string

  constructor(chat_id?: string) {
    this.repl = new Execute()
    this.config = default_config
    this.memory = new LTM()

    if (chat_id) {
      this.load(chat_id)
    }
    else {
      this.chat_id = crypto.randomBytes(8).toString('hex')
      fs.mkdirSync(path.join(EXECUTION_PATH, this.chat_id), { recursive: true })
      fs.mkdirSync(path.join(STATE_PATH, this.chat_id), { recursive: true })
      process.chdir(path.join(EXECUTION_PATH, this.chat_id))
    }
  }

  public save() {
    const dp = path.join(STATE_PATH, this.chat_id)
    if (!fs.existsSync(dp)) {
      fs.mkdirSync(dp, { recursive: true })
    }

    fs.writeFileSync(`${dp}/goal.txt`, this.goal)
    fs.writeFileSync(`${dp}/blocks.json`, JSON.stringify(this.blocks))
    fs.writeFileSync(`${dp}/messages.json`, JSON.stringify(this.messages))
    fs.writeFileSync(`${dp}/config.json`, JSON.stringify(this.config))
  }

  public async load(chat_id: string) {
    this.chat_id = chat_id
    const dp = path.join(STATE_PATH, chat_id)
    console.log(dp)
    if (fs.existsSync(dp + '/goal.txt')) {
      this.goal = fs.readFileSync(`${dp}/goal.txt`, 'utf8')
      this.blocks = JSON.parse(fs.readFileSync(`${dp}/blocks.json`, 'utf8'))
      this.messages = JSON.parse(fs.readFileSync(`${dp}/messages.json`, 'utf8'))
      this.config = JSON.parse(fs.readFileSync(`${dp}/config.json`, 'utf8'))
    }

    await this.memory.load()

    this.broadcast()
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

  public broadcast() {
    clientSocket.send(
      JSON.stringify({
        type: 'connected',
      }),
    )
    clientSocket.send(
      JSON.stringify({
        type: 'blocks',
        blocks: this.blocks,
      }),
    )
    clientSocket.send(
      JSON.stringify({
        type: 'config',
        content: this.config,
      }),
    )
    if (this.goal.length > 0) {
      clientSocket.send(
        JSON.stringify({
          type: 'goal',
          content: this.goal,
        }),
      )
    }
  }

  public setSystemPrompt(prompt: string) {
    this.config = {
      ...this.config,
      system_prompt: prompt as "chat" | "code-runner",
    }

    clientSocket.send(
      JSON.stringify({
        type: 'config',
        content: this.config,
      }),
    )

    this.save()
  }

  public setModel(model: string) {
    this.config = {
      ...this.config,
      model,
    }

    clientSocket.send(
      JSON.stringify({
        type: 'config',
        content: this.config,
      }),
    )

    this.save()
  }

  public getConfig() {
    return this.config
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
  model: string,
  system_prompt: 'code-runner' | 'chat'
}
