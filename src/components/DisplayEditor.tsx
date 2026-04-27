import { useEffect, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { schema } from '../schema'
import type { Node } from 'prosemirror-model'

interface DisplayEditorProps {
  doc: Node
}

export function DisplayEditor({ doc }: DisplayEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const state = EditorState.create({ doc, schema, plugins: [] })

    if (viewRef.current) {
      viewRef.current.setProps({ state })
    } else {
      viewRef.current = new EditorView(hostRef.current, {
        state,
        editable: () => false,
      })
    }

    return () => {
      // don't destroy on unmount — we reuse
    }
  }, [doc])

  // Cleanup on final unmount
  useEffect(() => {
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])

  return <div ref={hostRef} className="display-editor" />
}
