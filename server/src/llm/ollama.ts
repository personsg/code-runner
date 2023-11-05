import { WebSocket } from 'ws'
import { Config, Message } from '../runner'
import * as http from 'http'
import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { extractCode as extractCode2 } from './openai'
import chalk = require('chalk')
import { getSystemPrompt } from './llm'
import { buildPrompt } from './ollamaBuildPrompt'
require('dotenv').config()

const OLLAMA_HOSTNAME = process.env.OLLAMA_HOSTNAME || 'localhost'

export async function llm(
  inputMessages: Message[],
  config: Config,
  clientSocket?: WebSocket,
): Promise<ChatCompletionMessageParam> {
  const sys_prompt = getSystemPrompt(config)

  const prompt = buildPrompt(inputMessages, { role: 'system', content: sys_prompt }, config.model)

  const res = await post(prompt, config, clientSocket)

  console.log(chalk.green(res))

  const func = extractCodeFromLLMResponse(res)

  if (func) {
    return {
      role: 'assistant',
      content: res,
      function_call: {
        name: 'run_code',
        arguments: JSON.stringify({ language: 'javascript', code: func }),
      },
    }
  } else {
    return {
      role: 'assistant',
      content: res,
    }
  }
}

export async function getAvailableModels() {
  return new Promise<{ name: string }[]>((resolve, reject) => {
    const options = {
      hostname: OLLAMA_HOSTNAME,
      port: 11434,
      path: '/api/tags',
      method: 'GET',
    }

    const req = http.request(options, res => {
      res.on('data', chunk => {
        const content = JSON.parse(chunk.toString())
        resolve(content.models)
      })
    })

    req.on('error', error => {
      console.error(error)
    })

    req.end()
  })
}

async function post(prompt: string, config: Config, clientSocket?: WebSocket): Promise<string> {
  if (!config.model) {
    throw new Error('No model specified')
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: config.model,
      prompt: prompt,
      template: "{{ .Prompt }}",
    })

    const options = {
      hostname: OLLAMA_HOSTNAME,
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    }

    let parts = []

    if (clientSocket) {
      clientSocket.send(
        JSON.stringify({
          type: 'new-stream',
        }),
      )
    }

    const req = http.request(options, res => {
      res.on('data', chunk => {
        const content = JSON.parse(chunk.toString()).response
        parts.push(content)

        // TODO: if inside code block, add to function_call/arguments
        if (clientSocket) {
          try {
            clientSocket.send(
              JSON.stringify({
                type: 'part',
                part: {
                  choices: [{ delta: { content } }]
                }
              }),
            )
          } catch { }
        }
      })

      res.on('end', () => {
        console.log(parts.join(''))
        if (clientSocket) {
          clientSocket.send(
            JSON.stringify({
              type: 'end-stream',
            }),
          )
        }
        resolve(parts.join(''))
      })
    })

    req.on('error', error => {
      console.error(error)
    })

    req.write(postData)
    req.end()
  })
}

export function extractCode(content: string) {
  return extractCode2(content)
}

export function extractCodeFromLLMResponse(content: string) {
  const code_block_regex = /```([\s\S]*?)```/g
  const code_blocks = content.match(code_block_regex)

  if (!code_blocks) {
    return null
  } else {
    // strip out the backticks
    const code_block = code_blocks[0].replace(/```/g, '')
    return code_block
  }
}
