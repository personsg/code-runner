import * as openaillm from './openai'
import * as ollama from './ollama'
import { Config, Message } from '../runner'
import { WebSocket } from 'ws'
import { ollama_system_prompts } from './ollama_system_prompts'

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

export async function getAvailableModels() {
  const ollama_models = await ollama.getAvailableModels()

  return ollama_models.map(e => ({
    name: e.name
  }))
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
    const sys_prompt = ollama_system_prompts.find(p => p.name === config.system_prompt)
    if (!sys_prompt) {
      throw new Error(`System prompt ${config.system_prompt} does not exist`)
    }

    return sys_prompt.prompt
  }
  else if (config.family === "openai") {
    return openaillm.SYSTEM_PROMPT
  }
  else {
    throw new Error(`Unknown model family ${config.family}`)
  }
}
