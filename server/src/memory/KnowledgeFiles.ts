/**
 * knowledge files
 * 
 * add folders/files to the knowledge base
 * files are embedded into a vector store and are inserted into the chat stream as context
 * 
 * there's a special kind of knowledge folder, Audio, where the files need to be transcribed and added as context.
 * an index keeps track of which audio files have already been transcribed
 */
import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { KNOWLEDGE_PATH } from ".."
import * as fs from 'fs'
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
require('dotenv').config()

const OLLAMA_HOSTNAME = process.env.OLLAMA_HOSTNAME || 'localhost'

interface KnowledgeConfig {
  sources: {
    local: {
      knowledgeFiles: string[]
    }
  }
}

export class KnowledgeFiles {
  vectorStore: QdrantVectorStore | null = null
  embeddings: OllamaEmbeddings | null = null

  constructor() {
    this.setup()
  }

  async setup() {
    this.embeddings = new OllamaEmbeddings({
      model: 'orca-mini:3b',
      baseUrl: `http://${OLLAMA_HOSTNAME}:11434`,
    });

    const vectorStore = new QdrantVectorStore(this.embeddings, {
      url: "http://localhost:6333",
      collectionConfig: {
        vectors: {
          size: 3200,
          distance: 'Dot'
        }
      }
    })

    this.vectorStore = vectorStore
  }

  private getKnowledgeConfig() {
    const configPath = KNOWLEDGE_PATH + '/knowledge.json'
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return config as KnowledgeConfig
    }
    else {
      const config: KnowledgeConfig = {
        sources: {
          local: {
            knowledgeFiles: [],
          }
        }
      }
      fs.writeFileSync(configPath, JSON.stringify(config))
      return config
    }
  }

  private addFileToKnowledgeConfig(file: string) {
    const config = this.getKnowledgeConfig()
    config.sources.local.knowledgeFiles.push(file)
    this.saveKnowledgeConfig(config)
  }

  private saveKnowledgeConfig(config: KnowledgeConfig) {
    const configPath = KNOWLEDGE_PATH + '/knowledge.json'
    fs.writeFileSync(configPath, JSON.stringify(config))
  }

  async addFile(content: string) {
    await this.vectorStore.addDocuments([{
      pageContent: content,
      metadata: {
        type: 'file',
        source: 'user',
      }
    }])

    // this.addFileToKnowledgeConfig()
  }

  async searchMemory(query: string) {
    if (!this.vectorStore) {
      console.error('Memory not loaded.')
    }

    const results = await this.vectorStore.similaritySearch(query, 3)
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

export interface Memory {
  type: 'conversation' | 'file'
  source: 'user' | 'file' | 'agent'
  content: string
}
