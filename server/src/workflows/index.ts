import { ollama_system_prompts } from "../llm/ollama_system_prompts"
import * as runnerWorkflow from "./runnerWorkflow"
import * as knowledgeWorkflow from "./knowledgeWorkflow"

interface WorkflowInterface {
  systemPrompt: string
  trigger_UserMessage: any
  trigger_CodeApprovalButton: any
}

const WorkflowList: Record<string, WorkflowInterface> = {
  'code-runner': {
    systemPrompt: ollama_system_prompts["code-runner"],
    trigger_UserMessage: runnerWorkflow.trigger_UserMessage,
    trigger_CodeApprovalButton: runnerWorkflow.trigger_CodeApprovalButton,
  },
  'chat': {
    systemPrompt: ollama_system_prompts["chat"],
    trigger_UserMessage: runnerWorkflow.trigger_UserMessage,
    trigger_CodeApprovalButton: runnerWorkflow.trigger_CodeApprovalButton,
  },
  'knowledge': {
    systemPrompt: ollama_system_prompts["chat"],
    trigger_UserMessage: knowledgeWorkflow.trigger_UserMessage,
    trigger_CodeApprovalButton: knowledgeWorkflow.trigger_CodeApprovalButton,
  },
}

export default WorkflowList
