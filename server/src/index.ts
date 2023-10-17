import { WebSocketServer, WebSocket } from 'ws'
import { Runner } from './runner'
import * as path from 'path'
import * as fs from 'fs'
import { ollama_system_prompts } from './llm/ollama_system_prompts'
import * as express from 'express';
import * as multer from 'multer';
import { captionImage } from './multimodal/llava'
import { llm, getAvailableModels } from './llm/llm'
import WorkflowList from './workflows'

export const EXECUTION_PATH = path.join(__dirname, '../../workspaces')
export const STATE_PATH = path.join(__dirname, '../../state')
export const MEMORY_PATH = path.join(__dirname, '../../state/runner1/memory.db')
export const GLOBAL_CONFIG_PATH = path.join(__dirname, '../../config/config.json')

const workflows = WorkflowList

fs.mkdirSync(path.join(__dirname, '../../config'), { recursive: true })

let runner = new Runner()

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    let extArray = file.mimetype.split("/");
    let extension = extArray[extArray.length - 1];
    cb(null, file.fieldname + '-' + Date.now() + '.' + extension)
  }
})
const upload = multer({ storage: storage })

app.post('/upload-image', upload.single('image'), async (req, res) => {
  res.send('Image uploaded successfully.');

  const imagePath = req.file.path
  const caption = await captionImage(imagePath)

  if (runner) {
    runner.addMultiModalBlock(caption)
  }
});

app.get('/models', async (req, res) => {
  const models = await getAvailableModels()

  res.send(models)
})

app.listen(8081, () => {
  console.log('HTTP server listening on port 8081');
});

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
      await runner.handleNewUserMessage({
        role: 'user',
        content: message.content
      })
    } else if (message.type === 'approval') {
      runner.handleApprovedCode()
    } else if (message.type === 'chat') {
      if (!runner.chat_id) {
        runner = new Runner()
        runner.broadcast()
      }

      runner.handleNewUserMessage({
        role: 'user',
        content: message.content
      })
    } else if (message.type === 'new-chat') {
      runner = new Runner()
      runner.broadcast()
    } else if (message.type === 'switch-chat') {
      const chat_id = message.content
      runner = new Runner(chat_id)
      runner.broadcast()
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
    } else if (message.type === "set-workflow") {
      const workflow = WorkflowList[message.content]

      if (!workflow) {
        throw new Error(`System prompt ${message.content} does not exist`)
      }

      runner.setWorkflow(message.content)

      console.log('set workflow ', runner.getConfig().workflow_name)
    } else if (message.type === "set-model") {
      runner.setModel(message.content)

      console.log('set model', runner.getConfig().model)
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
