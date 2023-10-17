import * as openaillm from './openai'
import * as ollama from './ollama'
import { Config, Message } from '../runner'
import { WebSocket } from 'ws'
import { ollama_system_prompts } from './ollama_system_prompts'
import WorkflowList from '../workflows'

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
  const workflow = getWorkflowByName(config.workflow_name)

  if (config.family === "local") {
    const sys_prompt = workflow.systemPrompt
    if (!sys_prompt) {
      throw new Error(`System prompt ${sys_prompt} does not exist`)
    }

    return sys_prompt
  }
  else if (config.family === "openai") {
    return openaillm.SYSTEM_PROMPT
  }
  else {
    throw new Error(`Unknown model family ${config.family}`)
  }
}

export function getWorkflowByName(workflow_name: string) {
  const workflow = WorkflowList[workflow_name]

  if (!workflow) {
    throw `workflow doesn't exist: ${workflow}`
  }

  return workflow
}
