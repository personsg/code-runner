import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function Code({ code }: { code: string }) {
  return (
    <SyntaxHighlighter
      language='javascript'
      style={oneDark}
      customStyle={{
        fontSize: '14px',
      }}
    >
      {code}
    </SyntaxHighlighter>
  )
}

export default Code
