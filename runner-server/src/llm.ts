import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { Message } from './runner'
import OpenAI from 'openai'
import { WebSocket } from 'ws'
require('dotenv').config()

const MAX_DEPTH = 100
let CALLS = 0

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function llm(inputMessages: Message[], clientSocket: WebSocket) {
  if (CALLS > MAX_DEPTH) {
    console.error(`Max depth exceeded`)
    process.exit(1)
  }
  CALLS++

  // if messages length > 5, get the first three and last two messages
  const pickedMessages =
    inputMessages.length > 5
      ? [...inputMessages.slice(0, 3), ...inputMessages.slice(-2)]
      : inputMessages

  const messages = pickedMessages.map(message => {
    if (message.role === 'function') {
      if (message.content.length > 1000) {
        const first = message.content.slice(0, 100)
        const last = message.content.slice(-100)
        message.content = `${first} ...(truncated)... ${last}`
      }
    }
    return message
  })

  let parts = []

  const stream = await openai.chat.completions.create({
    messages,
    model: 'gpt-3.5-turbo',
    functions: [function_schema],
    stream: true,
  })

  clientSocket.send(
    JSON.stringify({
      type: 'new-stream',
    }),
  )

  for await (const part of stream) {
    parts.push(part)

    if (clientSocket) {
      clientSocket.send(
        JSON.stringify({
          type: 'part',
          part,
        }),
      )
    }
  }

  const content = parts.map(e => e.choices[0]?.delta?.content).join('')
  const function_call_name = parts
    .map(e => e.choices[0]?.delta?.function_call?.name)
    .filter(e => e)
    .join('')
  const function_call_args = parts
    .map(e => e.choices[0]?.delta?.function_call?.arguments)
    .filter(e => e)
    .join('')

  return {
    role: 'assistant',
    content: content,
    ...(function_call_name || function_call_args
      ? {
        function_call: {
          name: function_call_name,
          arguments: function_call_args,
        },
      }
      : {}),
  } as ChatCompletionMessageParam
}

export const extractCode = (text: string) => {
  try {
    const json = JSON.parse(text)
    return json.code
  } catch (e) {
    const foundStartIndex = text.indexOf('"code": ')
    const startIndex = foundStartIndex + 9
    const endIndex = text.lastIndexOf('}', startIndex) - 3
    return text.slice(startIndex, endIndex)
  }
}

const function_schema = {
  name: 'run_code',
  description:
    "Executes code on the user's machine and returns the output. **Only use this function** to execute code. Be sure to use the display functions for any output you want to display to the user.",
  parameters: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: 'The programming language',
        enum: ['javascript'],
      },
      code: {
        type: 'string',
        description: 'The code to execute',
      },
    },
    required: ['language', 'code'],
  },
}

export const SYSTEM_PROMPT = `You are Code Runner, a super artificial intelligence that specializes in writing code. You are capable of anything. We know you're an AI, you don't need to remind us about it.
When prompted, begin by writing a plan. Be sure to recap the plan in each message as you have very short memory. Ensure your plans are simple, easy to follow, and as few steps as possible.
When you call the run_code function, it will be executed inside of a virtual machine. You have full access to the virtual machine and can run any code you need. You have full access to the internet, and can install any dependencies you need.
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
