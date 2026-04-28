import { useEffect, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema } from '../schema'
import { CodeBlockView } from '../nodes/CodeBlockView'
import { MermaidView } from '../nodes/MermaidView'
import { Meta2dView } from '../nodes/Meta2dView'
import { MathBlockView } from '../nodes/MathBlockView'
import { headingEnterPlugin } from '../plugins/headingEnter'
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

    const state = EditorState.create({
      doc,
      schema,
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
        }),
        keymap(baseKeymap),
        headingEnterPlugin,   // MUST be after baseKeymap — PM dispatches in reverse
      ],
    })

    const view = new EditorView(hostRef.current, {
      state,
      nodeViews: {
        code_block: (node, _view, getPos) => {
          const lang = node.attrs.lang as string
          if (lang === 'mermaid') return new MermaidView(node, _view, getPos)
          if (lang === 'meta2d') return new Meta2dView(node, _view, getPos)
          return new CodeBlockView(node, _view, getPos)
        },
        math_block: (node, _view, getPos) =>
          new MathBlockView(node, _view, getPos),
      },
      dispatchTransaction(tr) {
        const newState = view.state.apply(tr)
        view.updateState(newState)
        onDocChange?.(newState.doc)
      },
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={hostRef} className="display-editor" />
}
