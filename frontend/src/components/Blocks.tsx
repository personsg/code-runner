import Markdown from 'markdown-to-jsx'
import Code from './Code'
import { Block } from '../../../server/src/runner'
import { Button, Box, Typography, ImageList, ImageListItem } from '@mui/material'

function Blocks({ blocks, socket }: { blocks: Block[]; socket: WebSocket }) {
  return blocks.map((e, i) => {
    if (e.type === 'goal') {
      return null
    } else if (e.type === 'assistant') {
      return (
        <Box marginBottom={2} sx={{ width: '100%', backgroundColor: '#333' }}>
          <Typography>{e.content}</Typography>
        </Box>
      )
    } else if (e.type === 'function_call') {
      return (
        <Box marginBottom={2}>
          <Code code={e.function_args.code} />
        </Box>
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
          <Box marginBottom={2}>
            <ImageList cols={1}>
              <ImageListItem>
                <img src={content} />
              </ImageListItem>
            </ImageList>
          </Box>
        )
      }
      if (content.includes('data:image/png;base64')) {
        return (
          <Box marginBottom={2}>
            <ImageList cols={1}>
              <ImageListItem>
                <img
                  src={content}
                  style={{
                    maxWidth: '100%',
                  }}
                />
              </ImageListItem>
            </ImageList>
          </Box>
        )
      }

      return (
        <Box
          bgcolor='#333333'
          padding={2}
          marginBottom={2}
        >
          <Markdown>
            {content.length > 200 ? content.substring(0, 200) + '...' : content}
          </Markdown>
        </Box>
      )
    } else if (e.type === 'user') {
      return (
        <Box
          sx={{ width: '100%' }}
          marginBottom={2}
        // bgcolor='#333333'
        >
          <Typography>{e.content}</Typography>
        </Box>
      )
    } else if (e.type === 'approval') {
      const isLastBlock = i === blocks.length - 1

      return (
        <Box marginBottom={2}>
          <Markdown>{e.content}</Markdown>
          {isLastBlock ? (
            <Button
              sx={{ ml: '1em' }}
              variant='contained'
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
            </Button>
          ) : null}
        </Box>
      )
    }
    else if (e.type === 'memory') {
      return <Box>
        <Typography style={{ backgroundColor: 'blue' }}>{JSON.stringify(e.content)}</Typography>
      </Box>
    }
  })
}

export default Blocks

