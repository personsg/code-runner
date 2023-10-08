import { useEffect, useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
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
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          top: goalSent ? '40px' : '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'top 0.7s ease-out',
        }}
      >
        <TextField
          sx={{
            width: goalSent ? '600px' : '400px',
            // height: '33px',
            // border: '1px solid black',
            transition: 'width 0.7s ease-out',
          }}
          type='text'
          value={goal}
          onChange={e => setGoal(e.target.value)}
          disabled={!!goalSent}
        />
        <Button
          sx={{
            marginLeft: '10px',
            // height: 'calc(33px + 2px)',
            // border: '1px solid black',
            visibility: goalSent ? 'hidden' : 'visible',
          }}
          variant='contained'
          onClick={() => sendGoal(goal)}
          disabled={!!goalSent}
        >
          Enter
        </Button>
        {goalSent && (
          <Button sx={{ marginLeft: '10px' }} variant='contained' onClick={() => newChat()}>
            New
          </Button>
        )}
      </Box>
      <Box sx={{ maxWidth: '800px', margin: '0 auto', marginTop: '80px' }}>
        {socket && <Blocks blocks={blocks} socket={socket} />}
        <Box>
          {isStreaming && (
            <>
              <Box sx={{ padding: '2em', marginBottom: '1em' }}>
                <Markdown>
                  {streamParts.map(e => e?.choices[0]?.delta?.content).join('')}
                </Markdown>
              </Box>
              {streamParts.some(
                e => e?.choices && e?.choices[0]?.delta?.function_call,
              ) && (
                  <Box sx={{ padding: '2em', marginBottom: '1em' }}>
                    <Markdown>
                      {streamParts
                        .map(e => e.choices[0]?.delta?.function_call?.arguments)
                        .join('')
                        .substring(-35) || ''}
                    </Markdown>
                  </Box>
                )}
            </>
          )}
        </Box>
        <Box sx={{ height: '80px' }}></Box>
      </Box>
      {goalSent && (
        <Box
          sx={{
            position: 'fixed',
            // height: '40px',
            bottom: '30px',
            width: '600px',
            display: 'flex',
            flexDirection: 'row',
            // backgroundColor: '#f0f0f0',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <TextField
            sx={{ flex: 1, marginRight: '10px' }}
            type='textarea'
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
          />
          <Button variant='contained' onClick={sendChatMessage}>Send</Button>
        </Box>
      )}
      {!socket ||
        (socket.readyState !== WebSocket.OPEN && (
          <Typography
            sx={{
              position: 'absolute',
              top: 16,
              right: 32,
              color: 'red',
              fontWeight: 'bold',
              fontSize: '24px',
            }}
          >
            No Connection
          </Typography>
        ))}
    </Box>
  )
}

export default App
