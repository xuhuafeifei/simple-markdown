import { useCallback } from 'react'
import { schema } from '../schema'
import type { EditorView } from 'prosemirror-view'
import type { MarkType } from 'prosemirror-model'

export const COLOR_WHITELIST = [
  '#e74c3c', // red
  '#e67e22', // orange
  '#f1c40f', // yellow
  '#2ecc71', // green
  '#3498db', // blue
  '#9b59b6', // purple
  '#1a1a1a', // black
  '#999999', // gray
]

interface FloatingToolbarProps {
  view: EditorView | null
  pos: { x: number; y: number } | null
}

export function FloatingToolbar({ view, pos }: FloatingToolbarProps) {
  const toggleMark = useCallback((markType: MarkType, attrs?: Record<string, unknown>) => {
    if (!view) return

    const { state } = view
    const { from, to } = state.selection
    if (from === to) return

    const mark = markType.create(attrs)
    const hasExact = state.doc.rangeHasMark(from, to, mark)

    if (hasExact) {
      view.dispatch(state.tr.removeMark(from, to, mark))
    } else if (attrs && state.doc.rangeHasMark(from, to, markType)) {
      // Replace existing mark of same type with different attrs (e.g. color)
      view.dispatch(state.tr.removeMark(from, to, markType).addMark(from, to, mark))
    } else {
      view.dispatch(state.tr.addMark(from, to, mark))
    }

    view.focus()
  }, [view])

  const addLink = useCallback(() => {
    if (!view) return
    const { state } = view
    const { from, to } = state.selection
    if (from === to) return

    const href = prompt('URL:')
    if (!href) return

    const linkMark = schema.marks.link.create({ href })
    view.dispatch(state.tr.addMark(from, to, linkMark))
    view.focus()
  }, [view])

  if (!pos) return null

  return (
    <div
      className="floating-toolbar"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={e => e.preventDefault()}
    >
      <button onClick={() => toggleMark(schema.marks.bold)}><strong>B</strong></button>
      <button onClick={() => toggleMark(schema.marks.italic)}><em>I</em></button>
      <button onClick={() => toggleMark(schema.marks.strike)}><s>S</s></button>
      <span className="toolbar-sep" />
      <button onClick={addLink}>Link</button>
      <span className="toolbar-sep" />
      <div className="color-swatches">
        {COLOR_WHITELIST.map(c => (
          <span
            key={c}
            className="color-swatch"
            style={{ background: c }}
            onClick={() => toggleMark(schema.marks.color, { value: c })}
          />
        ))}
      </div>
    </div>
  )
}
