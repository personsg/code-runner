import { WebSocket } from 'ws'
import { Config, Message } from '../runner'
import * as http from 'http'
import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { extractCode as extractCode2 } from './openai'
import { RUNNER_MODEL } from '..'
import chalk = require('chalk')
import { getSystemPrompt } from './llm'

export async function llm(
  inputMessages: Message[],
  config: Config,
  clientSocket?: WebSocket,
): Promise<ChatCompletionMessageParam> {
  const sys_prompt = getSystemPrompt(config)

  const prompt = build_prompt(inputMessages, sys_prompt)

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

async function post(prompt: string, config: Config, clientSocket?: WebSocket): Promise<string> {
  if (!config.model) {
    throw new Error('No model specified')
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: config.model,
      prompt: prompt,
    })

    const options = {
      hostname: 'localhost',
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

const build_prompt = (messages: Message[], system_prompt: string) => {
  const prompt = `<s>[INST] <<SYS>>
${system_prompt}
<</SYS>>

${messages
      .map((e, i) => {
        if (e.role === 'user') {
          if (i === 1) {
            return e.content + ' [/INST]\n'
          } else {
            return '<s>[INST] ' + e.content + ' [/INST]\n'
          }
        } else if (e.role === 'system') {
          return null
        } else {
          return ' ' + e.content.trim() + '</s>\n'
        }
      })
      .filter(e => e)
      .join('')}
`

  console.log(chalk.blue(prompt))
  return prompt
}
