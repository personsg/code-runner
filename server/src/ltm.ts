// long term memory module
import { MEMORY_PATH, RUNNER_MODEL } from "."
import { OpenAI } from "langchain/llms/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import * as fs from 'fs'

export interface Memory {
  type: 'conversation' | 'file'
  source: 'user' | 'file' | 'agent'
  content: string
  embedding?: number[]
}

class LTM {
  public embeddings: OllamaEmbeddings
  public vectorStore: HNSWLib | null = null

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: RUNNER_MODEL,
      baseUrl: "http://localhost:11434",
    });
  }

  async load() {
    if (fs.existsSync(MEMORY_PATH)) {
      this.vectorStore = await HNSWLib.load(MEMORY_PATH, this.embeddings)
      console.log('Loaded memory')
    }
    else {
      this.vectorStore = await HNSWLib.fromDocuments([], this.embeddings)
      console.log('Loaded memory')
    }
  }

  async addMemory(memory: Memory) {
    if (!this.vectorStore) {
      console.error('Memory not loaded. Loading...')
      await this.load()
    }

    await this.vectorStore.addDocuments([{
      pageContent: memory.content,
      metadata: {
        type: memory.type,
        source: memory.source,
      }
    }])
    await this.vectorStore.save(MEMORY_PATH)
  }

  async searchMemory(query: string) {
    if (!this.vectorStore) {
      console.error('Memory not loaded. Loading...')
      await this.load()
    }

    const results = await this.vectorStore.similaritySearch(query, 5)
    const memories = results.map(e => {
      const mem: Memory = {
        type: e.metadata.type,
        source: e.metadata.source,
        content: e.pageContent,
      }
      return mem
    })
    return memories
  }
}

export default LTM
