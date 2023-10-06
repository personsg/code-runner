import Markdown from 'markdown-to-jsx'
import Code from './Code'
import { Block } from '../../../runner-server/src/runner'

function Blocks({ blocks, socket }: { blocks: Block[]; socket: WebSocket }) {
  return blocks.map((e, i) => {
    if (e.type === 'goal') {
      return null
    } else if (e.type === 'assistant') {
      return (
        <div
          style={{
            marginBottom: '1em',
          }}
        >
          <Markdown>{e.content}</Markdown>
        </div>
      )
    } else if (e.type === 'function_call') {
      return (
        <div
          style={{
            marginBottom: '1em',
          }}
        >
          <Code code={e.function_args.code} />
        </div>
      )
    } else if (e.type === 'function_return') {
      let content = ''
      try {
        content = e.content.split('Result:')[1].trim()
      } catch {
        content = e.content
      }

      if (content.startsWith('http')) {
        return (
          <div
            style={{
              marginBottom: '1em',
            }}
          >
            <img src={content} />
          </div>
        )
      }
      if (content.includes('data:image/png;base64')) {
        return (
          <div
            style={{
              marginBottom: '1em',
            }}
          >
            <img
              src={content}
              style={{
                maxWidth: '100%',
              }}
            />
          </div>
        )
      }

      return (
        <div
          style={{
            backgroundColor: '#333333',
            padding: '2em',
            marginBottom: '1em',
          }}
        >
          <Markdown>
            {content.length > 200 ? content.substring(0, 200) + '...' : content}
          </Markdown>
        </div>
      )
    } else if (e.type === 'user') {
      return (
        <div
          style={{
            marginBottom: '1em',
            backgroundColor: '#333333',
          }}
        >
          <Markdown>{e.content}</Markdown>
        </div>
      )
    } else if (e.type === 'approval') {
      const isLastBlock = i === blocks.length - 1

      return (
        <div
          style={{
            marginBottom: '1em',
          }}
        >
          <Markdown>{e.content}</Markdown>
          {isLastBlock ? (
            <button
              onClick={() => {
                if (socket) {
                  socket.send(
                    JSON.stringify({
                      type: 'approval',
                      status: 'approved',
                    }),
                  )
                }
              }}
            >
              Approve
            </button>
          ) : null}
        </div>
      )
    }
    else if (e.type === 'memory') {
      return <div>
        <p style={{ backgroundColor: 'blue' }}>{JSON.stringify(e.content)}</p>
      </div>
    }
  })
}

// type BlockGoal = {
//   type: 'goal'
//   content: string
// }

// type BlockUser = {
//   type: 'user'
//   content: string
// }

// type BlockAssistant = {
//   type: 'assistant'
//   content: string
// }

// type BlockFunctionCall = {
//   type: 'function_call'
//   function_name: string
//   function_args: any
// }

// type BlockApproval = {
//   type: 'approval'
//   content: string
//   status: 'new' | 'approved' | 'rejected'
// }

// type BlockFunctionReturn = {
//   type: 'function_return'
//   content: string
// }

// export type Block =
//   | BlockUser
//   | BlockAssistant
//   | BlockFunctionCall
//   | BlockApproval
//   | BlockGoal
//   | BlockFunctionReturn

export default Blocks
