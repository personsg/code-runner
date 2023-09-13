import * as openaillm from './openai'
import * as ollama from './ollama'
import { Config, Message } from './runner'
import { WebSocket } from 'ws'


// TODO move this all to an adapter system
export async function llm(inputMessages: Message[], config: Config, clientSocket?: WebSocket) {
  console.log(`llm call ${config.family} ${config.model}`)
  if (config.family === "local") {
    return ollama.llm(inputMessages, config, clientSocket)
  }
  else if (config.family === "openai") {
    return openaillm.llm(inputMessages, config, clientSocket)
  }
  else {
    throw new Error(`Unknown model family ${config.family}`)
  }
}

export function extractCode(content: string, config: Config) {
  if (config.family === "local") {
    return ollama.extractCode(content)
  }
  else if (config.family === "openai") {
    return openaillm.extractCode(content)
  }
  else {
    throw new Error(`Unknown model family ${config.family}`)
  }
}

export function getSystemPrompt(config: Config) {
  if (config.family === "local") {
    return ollama.SYSTEM_PROMPT
  }
  else if (config.family === "openai") {
    return openaillm.SYSTEM_PROMPT
  }
  else {
    throw new Error(`Unknown model family ${config.family}`)
  }
}
