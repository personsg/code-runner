import { WebSocket } from 'ws'
import { Config, Message } from './runner'
import * as http from 'http'
import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { extractCode as extractCode2 } from './openai'

export async function llm(
  inputMessages: Message[],
  config: Config,
  clientSocket?: WebSocket,
): Promise<ChatCompletionMessageParam> {
  const prompt = build_prompt(inputMessages)

  const res = await post(prompt, clientSocket)

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

async function post(prompt: string, clientSocket?: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'codellama:7b-instruct',
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

const build_prompt = (messages: Message[]) => {
  const prompt = `<s>[INST] <<SYS>>
${SYSTEM_PROMPT}
<</SYS>>

${messages
      .map((e, i) => {
        if (e.role === 'user') {
          if (i === 0) {
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

  return prompt
}

export const SYSTEM_PROMPT = `You are Code Runner, a super artificial intelligence that specializes in writing code. You are capable of anything. We know you're an AI, you don't need to remind us about it.
When prompted, begin by writing a plan. Be sure to recap the plan in each message as you have very short memory. Ensure your plans are simple, easy to follow, and as few steps as possible.
To run code, return a markdown code block (three backticks, \`\`\`). Any code you return will be run directly on the machine. You have full access to the virtual machine and can run any code you need. You have full access to the internet, and can install any dependencies you need.
Only use the function you have been provided with, run_code.
Write code in nodejs javascript. These packages have already been installed and are available: axios, image-charts, papaparse, cheerio. When possible, prefer to use these packages over others.
If you want to save any large amounts of data, write it to a file.
You have access to a local workspace, and both you and the user can read and write files from the workspace.
Write messages to the user in markdown, and they will be displayed in a React frontend. You can also display images by having run_code return the image url or path.

Image Charts Example Below.
\`\`\`
import ImageCharts from 'image-charts';

const chart_url = ImageCharts()
.cht('bvg') // REQUIRED: type, vertical bar chart
.chs('300x300') // REQUIRED: size, 300px x 300px
.chd('a:60,40') // REQUIRED: data, 2 data points: 60 and 40
.toDataURI(); // REQUIRED: **ALWAYS use .toDataURI()** when exporting chart

chart_url
\`\`\``
