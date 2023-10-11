import { useEffect, useState } from 'react'
import { Box, Button, TextField, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, ListItemIcon, Select, MenuItem, Stack } from '@mui/material'
import Markdown from 'markdown-to-jsx'
import Blocks from './components/Blocks'
import { Block, Config } from '../../server/src/runner'
import ChatDrawer from './components/ChatDrawer'
import { useWebSocket } from './lib/useWebSocket';
import { useChat } from './lib/useChat';
import { useAppWebSocket } from './lib/useAppWebSocket'
import { Goal } from './components/Goal'

function App() {
  const {
    goal,
    setGoal,
    goalSent,
    setGoalSent,
    blocks,
    setBlocks,
    socket,
    chats,
    setChats,
    listChats,
    config,
  } = useAppWebSocket();

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamParts, setStreamParts] = useState<any[]>([])
  const [chatMessage, setChatMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const switchChat = (chat_id: string) => {
    if (socket) {
      const payload = {
        type: 'switch-chat',
        content: chat_id,
      }
      socket.send(JSON.stringify(payload))
    }
  }

  const deleteChat = (chat_id: string) => {
    if (socket) {
      const payload = {
        type: 'delete-chat',
        content: chat_id
      }
      socket.send(JSON.stringify(payload))
    }
  }

  const switchSystemPrompt = (prompt: string) => {
    if (socket) {
      const payload = {
        type: 'set-system-prompt',
        content: prompt,
      }
      socket.send(JSON.stringify(payload))
    }
  }

  const switchModel = (model: string) => {
    if (socket) {
      const payload = {
        type: 'set-model',
        content: model,
      }
      socket.send(JSON.stringify(payload))
    }
  }

  const resetState = () => {
    setGoal('')
    setGoalSent(false)
    setBlocks([])
    setIsStreaming(false)
    setStreamParts([])
  }

  return (
    <Box>
      <Box sx={{ maxWidth: '200px', position: 'absolute', top: '16px', left: '16px' }}>
        <Stack direction={"column"} spacing={2}>
          <Button
            onClick={() => setDrawerOpen(true)}
            variant='contained'
          >Chats</Button>
          <Select
            sx={{ marginLeft: '10px' }}
            value={config ? config.system_prompt : ''}
            onChange={(event) => switchSystemPrompt(event.target.value)}
          >
            <MenuItem value='code-runner'>Code Runner</MenuItem>
            <MenuItem value='chat'>Chat</MenuItem>
          </Select>
          <Select
            sx={{ marginLeft: '10px' }}
            value={config ? config.model : ''}
            onChange={(event) => switchModel(event.target.value)}
          >
            <MenuItem value='codellama:7b-instruct'>codellama:7b-instruct</MenuItem>
            <MenuItem value='codellama:13b-instruct'>codellama:13b-instruct</MenuItem>
            <MenuItem value='mistral:instruct'>mistral:instruct</MenuItem>
          </Select>
          <ChatDrawer
            chats={chats}
            switchChat={switchChat}
            deleteChat={deleteChat}
            drawerOpen={drawerOpen}
          />
        </Stack>
      </Box>
      <Goal
        goal={goal}
        setGoal={setGoal}
        goalSent={goalSent}
        sendGoal={sendGoal}
      />
      {goalSent && (
        <Button sx={{ marginLeft: '10px', position: 'absolute', right: '16px', top: '16px' }} variant='contained' onClick={() => newChat()}>
          New
        </Button>
      )}
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
      {
        goalSent && (
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
              multiline
            />
            <Button variant='contained' onClick={sendChatMessage}>Send</Button>
          </Box>
        )
      }
      {
        !socket ||
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
        ))
      }
    </Box >
  )
}

export default App
