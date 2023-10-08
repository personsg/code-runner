import { WebSocketServer, WebSocket } from 'ws'
import { Runner } from './runner'
import * as path from 'path'
import * as fs from 'fs'

export const EXECUTION_PATH = path.join(__dirname, '../../workspaces')
export const STATE_PATH = path.join(__dirname, '../../state')
export const MEMORY_PATH = path.join(__dirname, '../../state/runner1/memory.db')
export const RUNNER_MODEL = 'codellama:13b-instruct'

let runner = new Runner()

const wss = new WebSocketServer({
  port: 8080,
})

let clientSocket: null | WebSocket = null

wss.on('connection', function connection(ws) {
  clientSocket = ws
  ws.on('error', console.error)

  ws.on('message', async function message(data: string) {
    const message = JSON.parse(data)

    if (message.type === 'goal') {
      runner.goal = message.content
      await runner.generateInitialPlan()
    } else if (message.type === 'approval') {
      runner.approveCodeBlock()
    } else if (message.type === 'chat') {
      // if current chat doesn't exist, create a new runner
      if (!runner.chat_id) {
        runner = new Runner()
      }

      runner.userResponse(message.content)
    } else if (message.type === 'new-chat') {
      runner = new Runner()
    } else if (message.type === 'switch-chat') {
      const chat_id = message.content
      runner = new Runner(chat_id)
    } else if (message.type === 'list-chats') {
      const chats = fs.readdirSync(STATE_PATH)
      ws.send(
        JSON.stringify({
          type: 'list-chats',
          content: chats,
        }),
      )
    } else if (message.type === 'delete-chat') {
      const chat_id = message.content

      // if (runner.chat_id === chat_id) {
      //   runner = new Runner()
      // }

      const chatPath = path.join(STATE_PATH, chat_id)
      if (fs.existsSync(chatPath)) {
        fs.rmSync(chatPath, { recursive: true })
        const chats = fs.readdirSync(STATE_PATH)
        ws.send(
          JSON.stringify({
            type: 'list-chats',
            content: chats,
          }),
        )
      } else {
        ws.send(
          JSON.stringify({
            type: 'error',
            content: `Chat ${chat_id} does not exist`,
          }),
        )
      }
    }
  })

  runner.broadcast()

  const chats = fs.readdirSync(STATE_PATH)
  ws.send(
    JSON.stringify({
      type: 'list-chats',
      content: chats,
    }),
  )
})

console.log('Server started on port 8080')

export { clientSocket }
