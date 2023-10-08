import { useEffect, useState } from 'react'
import './App.css'
import Markdown from 'markdown-to-jsx'
import Blocks from './components/Blocks'
import { Block } from '../../server/src/runner'

function App() {
  const [goal, setGoal] = useState('')
  const [goalSent, setGoalSent] = useState(false)
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamParts, setStreamParts] = useState<any[]>([])
  const [chatMessage, setChatMessage] = useState('')

  const sendGoal = (message: string) => {
    if (socket) {
      const payload = {
        type: 'goal',
        content: message,
      }
      setGoalSent(true)
      socket.send(JSON.stringify(payload))
    }
  }

  const sendChatMessage = () => {
    // optimistic update
    const block: Block = {
      type: 'user',
      content: chatMessage,
    }
    setBlocks(prev => [...prev, block])

    if (socket) {
      const payload = {
        type: 'chat',
        content: chatMessage,
      }
      socket.send(JSON.stringify(payload))
      setChatMessage('')
    }
  }

  const newChat = () => {
    if (confirm('Are you sure you want to start a new chat?')) {
      if (socket) {
        const payload = {
          type: 'new-chat',
          content: '',
        }
        socket.send(JSON.stringify(payload))
        resetState()
      }
    }
  }

  const resetState = () => {
    setGoal('')
    setGoalSent(false)
    setBlocks([])
    setIsStreaming(false)
    setStreamParts([])
  }

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080')

    setSocket(socket)

    socket.onopen = () => {
      console.log('Connected to the server')
    }

    socket.onmessage = event => {
      const data = JSON.parse(event.data)
      if (data.type === 'goal') {
        setGoal(data.content)
        setGoalSent(true)
      }
      if (data.type === 'blocks') {
        setBlocks(data.blocks)
        setIsStreaming(false)
        setStreamParts([])
        // @ts-ignore for debug
        globalThis.Blocks = data.blocks
      }
      if (data.type === 'new-stream') {
        setIsStreaming(true)
      }
      if (data.type === 'part') {
        setStreamParts(prev => [...prev, data.part])
      }
    }

    return () => {
      socket.close()
    }
  }, [])

  return (
    <div>
      <div className={`goal-container ${goalSent ? 'goal-sent' : ''}`}>
        <input
          className={`goal-input ${goalSent ? 'goal-sent' : ''}`}
          type='text'
          value={goal}
          onChange={e => setGoal(e.target.value)}
          disabled={!!goalSent}
        />
        <button
          className={`goal-button ${goalSent ? 'goal-sent' : ''}`}
          onClick={() => sendGoal(goal)}
          disabled={!!goalSent}
        >
          Enter
        </button>
        {goalSent && (
          <button className={`goal-button`} onClick={() => newChat()}>
            New
          </button>
        )}
      </div>
      <div className='messages-list'>
        {socket && <Blocks blocks={blocks} socket={socket} />}
        <div>
          {isStreaming && (
            <>
              <div>
                <Markdown>
                  {streamParts.map(e => e?.choices[0]?.delta?.content).join('')}
                </Markdown>
              </div>
              {streamParts.some(
                e => e?.choices && e?.choices[0]?.delta?.function_call,
              ) && (
                  <div className='function-call'>
                    <Markdown>
                      {streamParts
                        .map(e => e.choices[0]?.delta?.function_call?.arguments)
                        .join('')
                        .substring(-35) || ''}
                    </Markdown>
                  </div>
                )}
            </>
          )}
        </div>
        <div className='bottom-spacing'></div>
      </div>
      {goalSent && (
        <div className='chat-container'>
          <input
            className='chat-input'
            type='textarea'
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
          />
          <button onClick={sendChatMessage}>Send</button>
        </div>
      )}
      {!socket ||
        (socket.readyState !== WebSocket.OPEN && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 32,
              color: 'red',
              fontWeight: 'bold',
              fontSize: '24px',
            }}
          >
            No Connection
          </div>
        ))}
    </div>
  )
}

export default App
