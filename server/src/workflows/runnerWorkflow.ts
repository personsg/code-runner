import { WebSocket } from "ws";
import { extractCode, llm } from "../llm/llm";
import { Block, Config, Message } from "../runner";
import Execute from "../repl";
import { exec } from "child_process";

export async function executeWorkflow(
  context: {
    clientSocket: WebSocket
  },
  plugins: {
    llmConfig: Config,
    systemPrompt: string,
    messageLog: {
      addMessage: (message: Message) => void
      getMessages: () => Message[]
    },
    blockLog: {
      addBlock: (block: Block) => void,
      getBlocks: () => void
    },
    repl: Execute,
    system: {
      save: () => void
    }
  },
  input: Message
) {
  if (input.role === "user") {
    plugins.messageLog.addMessage(input)
    plugins.blockLog.addBlock({
      type: 'user',
      content: input.content
    })
    plugins.system.save()

    const messages = plugins.messageLog.getMessages()

    const response = await llm([{
      role: 'system',
      content: plugins.systemPrompt,
    }, ...messages], plugins.llmConfig, context.clientSocket)

    plugins.messageLog.addMessage(response)

    if (response.content) {
      plugins.blockLog.addBlock({
        type: 'assistant',
        content: response.content
      })
    }

    if (response.function_call) {
      plugins.blockLog.addBlock({
        type: 'function_call',
        function_name: response.function_call.name,
        function_args: {
          language: 'javascript',
          code: extractCode(response.function_call.arguments, plugins.llmConfig)
        },
      })
      plugins.blockLog.addBlock({
        type: 'approval',
        content: 'Do you want to run this code?',
        status: 'new'
      })

      plugins.system.save()
    }
  }

  if (input.role === 'function') {
    const messages = plugins.messageLog.getMessages()
    const response = await llm([{ role: 'system', content: plugins.systemPrompt }, ...messages], plugins.llmConfig, context.clientSocket)

    if (response.content) {
      plugins.blockLog.addBlock({
        type: 'assistant',
        content: response.content
      })
      plugins.messageLog.addMessage(response)
    }

    if (response.function_call) {
      plugins.blockLog.addBlock({
        type: 'function_call',
        function_name: response.function_call.name,
        function_args: {
          language: 'javascript',
          code: extractCode(response.function_call.arguments, plugins.llmConfig)
        }
      })
      plugins.blockLog.addBlock({
        type: 'approval',
        content: 'Do you want to run this code?',
        status: 'new'
      })
    }
  }

  plugins.system.save()
}

export async function handleApprovedCode(
  context: {
    clientSocket: WebSocket
  },
  plugins: {
    llmConfig: Config,
    systemPrompt: string,
    messageLog: {
      addMessage: (message: Message) => void
      getMessages: () => Message[]
    },
    blockLog: {
      addBlock: (block: Block) => void,
      getBlocks: () => Block[]
    },
    repl: Execute,
    system: {
      save: () => void
    }
  },
) {
  let blocks = plugins.blockLog.getBlocks()

  const lastBlock = blocks[blocks.length - 1]
  const codeBlock = blocks[blocks.length - 2]
  if (lastBlock.type === 'approval' && codeBlock.type === 'function_call') {
    lastBlock.status = 'approved'
    context.clientSocket.send(
      JSON.stringify({
        type: 'blocks',
        blocks: blocks,
      }),
    )

    try {
      const result = await plugins.repl.run(codeBlock.function_args.code)
      const res = result.result

      plugins.blockLog.addBlock({
        type: 'function_return',
        content: String(res),
      })
      plugins.messageLog.addMessage({
        role: 'function',
        name: 'run_code',
        content: String(res) === '' ? 'No Output' : String(res),
      })
      plugins.system.save()

      blocks = plugins.blockLog.getBlocks()

      context.clientSocket.send(
        JSON.stringify({
          type: 'blocks',
          blocks: blocks,
        }),
      )

      return executeWorkflow(context, plugins, {
        role: 'function',
        name: 'run_code',
        content: String(res) === '' ? 'No Output' : String(res)
      })
    } catch (e) {
      console.error(e)
    }
  }
}