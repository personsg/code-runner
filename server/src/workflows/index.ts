import { WebSocket } from "ws"
import { clientSocket } from ".."
import { ollama_system_prompts } from "../llm/ollama_system_prompts"
import { trigger_CodeApprovalButton, trigger_UserMessage } from "./runnerWorkflow"
import { Message } from "../runner"

interface WorkflowInterface {
  systemPrompt: string
  trigger_UserMessage: any
  trigger_CodeApprovalButton: any
}

const WorkflowList: Record<string, WorkflowInterface> = {
  'code-runner': {
    systemPrompt: ollama_system_prompts["code-runner"],
    trigger_UserMessage,
    trigger_CodeApprovalButton,
  },
  'chat': {
    systemPrompt: ollama_system_prompts["chat"],
    trigger_UserMessage,
    trigger_CodeApprovalButton,
  }
}

export default WorkflowList
