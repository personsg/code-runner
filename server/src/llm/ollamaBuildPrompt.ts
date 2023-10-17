import chalk = require("chalk");
import { Message } from "../runner";

const orca_style = ["mistral-openorca"]

export function buildPrompt(messages: Message[], systemMessage: Message, model: string) {
  if (orca_style.some(e => model.startsWith(e))) {
    return buildPromptOrcaStyle(messages, systemMessage)
  }
  else {
    return buildPromptLLamaStyle(messages, systemMessage)
  }
}

export function buildPromptOrcaStyle(messages: Message[], systemMessage: Message) {
  console.log(chalk.blue("buildPromptOrcaStyle"))
  const prompt = `<|im_start|>system ${systemMessage.content}<|im_end|>

${messages.map(e => {
    if (e.role === 'user' || e.role === "function") {
      return `<|im_start|>user
${e.content}<|im_end|>`
    }
    else if (e.role === "assistant") {
      return `<|im_start|>assistant
${e.content}<|im_end|>`
    }
  }).join('\n')}

<|im_start|>assistant`

  console.log(chalk.blue(prompt))
  return prompt
}

export function buildPromptLLamaStyle(messages: Message[], systemMessage: Message) {
  const prompt = `[INST] <<SYS>>
${systemMessage.content}
<</SYS>>

${messages
      .map((e, i) => {
        if (e.role === 'user') {
          if (i === 1) {
            return e.content + ' [/INST]\n'
          } else {
            return '[INST] ' + e.content + ' [/INST]\n'
          }
        } else if (e.role === 'system') {
          return null
        } else {
          return ' ' + e.content.trim() + '\n'
        }
      })
      .filter(e => e)
      .join('')}
`

  console.log(chalk.blue(prompt))
  return prompt
}