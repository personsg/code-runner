import { ChatCompletionMessageParam } from 'openai/resources/chat'
import Execute from './repl'
import { EXECUTION_PATH, STATE_PATH, clientSocket, GLOBAL_CONFIG_PATH } from '.'
import * as fs from 'fs'
import { extractCode, llm, getSystemPrompt } from './llm/llm'
import LTM, { Memory } from './memory/ltm'
import * as crypto from 'crypto'
import * as path from 'path'
import { executeWorkflow, handleApprovedCode } from './workflows/runnerWorkflow'
require('dotenv').config()

const default_config: Config = {
  family: 'local',
  model: "mistral:instruct",
  system_prompt: 'chat',
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
    this.memory = new LTM()


    if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
      this.config = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'))
    }
    else {
      this.config = default_config
    }

    if (chat_id) {
      this.load(chat_id)
    }
    else {
      this.chat_id = crypto.randomBytes(8).toString('hex')
      fs.mkdirSync(path.join(EXECUTION_PATH, this.chat_id), { recursive: true })
      fs.mkdirSync(path.join(STATE_PATH, this.chat_id), { recursive: true })
      // process.chdir(path.join(EXECUTION_PATH, this.chat_id))
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

  public addMultiModalBlock(message: string) {
    this.messages.push({
      role: 'user',
      content: `The user uploaded an image with the following description: \n ${message}`
    })

    this.blocks.push({
      type: 'user',
      content: `The user uploaded an image with the following description: \n ${message}`
    })

    this.save()
    this.broadcast()
  }

  public async handleNewUserMessage(message: Message) {
    executeWorkflow({
      clientSocket,
    },
      {
        llmConfig: this.config,
        systemPrompt: getSystemPrompt(this.config),
        messageLog: {
          addMessage: (message: Message) => this.messages.push(message),
          getMessages: () => this.messages
        },
        blockLog: {
          addBlock: (block: Block) => {
            this.blocks.push(block)
            clientSocket.send(
              JSON.stringify({
                type: 'blocks',
                blocks: this.blocks,
              }),
            )
          },
          getBlocks: () => this.blocks
        },
        repl: this.repl,
        system: {
          save: () => this.save()
        }
      },
      message)
    this.save()
    this.broadcast()
  }

  public async handleApprovedCode() {
    handleApprovedCode(
      {
        clientSocket,
      },
      {
        llmConfig: this.config,
        systemPrompt: getSystemPrompt(this.config),
        messageLog: {
          addMessage: (message: Message) => this.messages.push(message),
          getMessages: () => this.messages
        },
        blockLog: {
          addBlock: (block: Block) => {
            this.blocks.push(block)
            clientSocket.send(
              JSON.stringify({
                type: 'blocks',
                blocks: this.blocks,
              }),
            )
          },
          getBlocks: () => this.blocks
        },
        repl: this.repl,
        system: {
          save: () => this.save()
        }
      }
    )
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
    // Save the updated config to the global config path
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(this.config))
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
    // Save the updated config to the global config path
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(this.config))
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
