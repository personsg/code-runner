import { WebSocketServer, WebSocket } from 'ws'
import { Runner } from './runner'
import * as path from 'path'
import * as fs from 'fs'

export const EXECUTION_PATH = path.join(__dirname, '../../workspaces/runner1')
export const DATA_PATH = path.join(__dirname, '../../state/runner1')

fs.mkdirSync(EXECUTION_PATH, { recursive: true })
fs.mkdirSync(DATA_PATH, { recursive: true })
process.chdir(EXECUTION_PATH)

let runner = new Runner()
runner.load()

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
      runner.userResponse(message.content)
    } else if (message.type === 'new-chat') {
      runner = new Runner()
    }
  })

  ws.send(
    JSON.stringify({
      type: 'connected',
    }),
  )
  ws.send(
    JSON.stringify({
      type: 'blocks',
      blocks: runner.blocks,
    }),
  )
  if (runner.goal.length > 0) {
    ws.send(
      JSON.stringify({
        type: 'goal',
        content: runner.goal,
      }),
    )
  }
})

console.log('Server started on port 8080')

export { clientSocket }
