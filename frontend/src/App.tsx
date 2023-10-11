import { useState } from 'react'
import { Box, Button, TextField, Typography, Select, MenuItem, Stack } from '@mui/material'
import Markdown from 'markdown-to-jsx'
import Blocks from './components/Blocks'
import { Block } from '../../server/src/runner'
import ChatDrawer from './components/ChatDrawer'
import { useAppWebSocket } from './lib/useAppWebSocket'
import { Goal } from './components/Goal'
import { useSelector } from 'react-redux'
import { RootState } from './lib/store'
import { ImageUploader } from './components/ImageUploader'

function App() {
  const appState = useSelector((state: RootState) => state.appState);
  const {
    goal,
    setGoal,
    goalSent,
    setGoalSent,
    blocks,
    setBlocks,
    socket,
    chats,
    config,
    resetState,
    isStreaming,
    streamParts
  } = useAppWebSocket();

  const [chatMessage, setChatMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sendPayload = (type: string, content: string) => {
    if (socket) {
      const payload = {
        type,
        content,
      }
      socket.send(JSON.stringify(payload))
    }
  }

  const sendGoal = (message: string) => {
    sendPayload('goal', message);
    setGoalSent(true);
  }

  const sendChatMessage = () => {
    const block: Block = {
      type: 'user',
      content: chatMessage,
    }
    setBlocks(prev => [...prev, block])
    sendPayload('chat', chatMessage);
    setChatMessage('')
  }

  const newChat = () => {
    if (confirm('Are you sure you want to start a new chat?')) {
      sendPayload('new-chat', '');
      resetState()
    }
  }

  const switchChat = (chat_id: string) => {
    sendPayload('switch-chat', chat_id);
  }

  const deleteChat = (chat_id: string) => {
    sendPayload('delete-chat', chat_id);
  }

  const switchSystemPrompt = (prompt: string) => {
    sendPayload('set-system-prompt', prompt);
  }

  const switchModel = (model: string) => {
    sendPayload('set-model', model);
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
            setDrawerOpen={setDrawerOpen}
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
              bottom: '30px',
              width: '600px',
              display: 'flex',
              flexDirection: 'row',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {appState.experiments.includes('llava') && (
              <ImageUploader />
            )}
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
