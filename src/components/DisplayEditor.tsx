import { useEffect, useRef, useState } from 'react'
import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { inputRules, textblockTypeInputRule, undoInputRule } from 'prosemirror-inputrules'
import { schema } from '../schema'
import { CodeBlockView } from '../nodes/CodeBlockView'
import { MermaidView } from '../nodes/MermaidView'
import { Meta2dView } from '../nodes/Meta2dView'
import { MathBlockView } from '../nodes/MathBlockView'
import { imagePastePlugin } from '../plugins/imagePaste'
import { enterPlugin } from '../plugins/enterPlugin'
import { FloatingToolbar } from './FloatingToolbar'
import type { Node } from 'prosemirror-model'

interface DisplayEditorProps {
  doc: Node
  onDocChange?: (doc: Node) => void
}

export function DisplayEditor({ doc, onDocChange }: DisplayEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null)

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
          Backspace: undoInputRule,
        }),
        // Heading input rules: # h1, ## h2, etc.
        inputRules({
          rules: [
            textblockTypeInputRule(
              /^(#{1,6})\s$/,
              schema.nodes.heading,
              match => ({ level: match[1].length }),
            ),
          ],
        }),
        enterPlugin,
        keymap(baseKeymap),
        imagePastePlugin,
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

        requestAnimationFrame(() => {
          if (view.isDestroyed) return
          const sel = view.state.selection
          if (sel.empty) {
            setToolbarPos(null)
            return
          }
          try {
            const start = view.coordsAtPos(sel.from)
            const end = view.coordsAtPos(sel.to)
            // center above the selection
            setToolbarPos({
              x: (start.left + end.right) / 2,
              y: start.top - 48,
            })
          } catch {
            setToolbarPos(null)
          }
        })
      },
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div ref={hostRef} className="display-editor" />
      <FloatingToolbar view={viewRef.current} pos={toolbarPos} />
    </>
  )
}
