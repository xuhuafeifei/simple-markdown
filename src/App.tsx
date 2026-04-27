import { useState, useMemo, useCallback, useRef } from 'react'
import { SourceEditor } from './components/SourceEditor'
import { DisplayEditor } from './components/DisplayEditor'
import { fromMarkdown, toMarkdown } from './codec/fromMarkdown'
import type { Node } from 'prosemirror-model'

type Mode = 'source' | 'display'

const DEFAULT_MD = `# Simple Markdown

Hello **world**! This is a *paragraph* with ~~strike~~.

## Code

\`\`\`javascript
console.log('hello')
\`\`\`

## List

- item one
- item two
- [ ] todo
- [x] done

## Quote

> blockquote text

## Math

$$
x^2 + y^2 = z^2
$$

Inline: $E = mc^2$

---

## Colors

<span style="color:red">red text</span> and normal text.

## Links

[example](https://example.com)
`

export default function App() {
  const [mode, setMode] = useState<Mode>('source')
  const [text, setText] = useState(DEFAULT_MD)
  // Track the latest doc from Display mode editing
  const displayDocRef = useRef<Node | null>(null)

  const doc = useMemo(() => {
    try {
      return fromMarkdown(text)
    } catch {
      return fromMarkdown('')
    }
  }, [text])

  const handleDisplayDocChange = useCallback((doc: Node) => {
    displayDocRef.current = doc
  }, [])

  const toggleMode = useCallback(() => {
    if (mode === 'display' && displayDocRef.current) {
      // Serialize any Display edits back to text
      setText(toMarkdown(displayDocRef.current))
    }
    setMode(m => (m === 'source' ? 'display' : 'source'))
  }, [mode])

  return (
    <div className="app">
      <header className="toolbar">
        <button onClick={toggleMode}>
          {mode === 'source' ? 'Display' : 'Source'}
        </button>
        <span className="mode-label">
          Mode: {mode === 'source' ? 'Source' : 'Display'}
        </span>
      </header>
      <main>
        {mode === 'source' ? (
          <SourceEditor value={text} onChange={setText} />
        ) : (
          <DisplayEditor doc={doc} onDocChange={handleDisplayDocChange} />
        )}
      </main>
    </div>
  )
}
