import { useEffect, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema } from '../schema'
import type { Node } from 'prosemirror-model'

interface DisplayEditorProps {
  doc: Node
  onDocChange?: (doc: Node) => void
}

export function DisplayEditor({ doc, onDocChange }: DisplayEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const plugins = [
      history(),
      keymap({
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-Shift-z': redo,
      }),
      keymap(baseKeymap),
    ]

    if (viewRef.current) {
      // Update existing view with new doc
      const state = EditorState.create({ doc, schema, plugins })
      viewRef.current.setProps({ state })
    } else {
      const state = EditorState.create({ doc, schema, plugins })
      const view = new EditorView(hostRef.current, {
        state,
        dispatchTransaction(tr) {
          const newState = view.state.apply(tr)
          view.updateState(newState)
          onDocChange?.(newState.doc)
        },
      })
      viewRef.current = view
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Only run on mount — doc updates are handled by the transaction dispatch

  // Sync external doc changes (e.g., from Source mode)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    // Only update if the doc actually changed externally
    if (view.state.doc !== doc && view.state.doc.eq(doc) === false) {
      const state = EditorState.create({
        doc,
        schema,
        plugins: view.state.plugins,
      })
      view.setProps({ state })
    }
  }, [doc])

  useEffect(() => {
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])

  return <div ref={hostRef} className="display-editor" />
}

export function getDisplayDoc(view: EditorView | null): Node | null {
  return view?.state.doc ?? null
}
