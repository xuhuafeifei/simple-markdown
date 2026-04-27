import { EditorView as CmView } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import type { NodeView, EditorView as PmView } from 'prosemirror-view'
import type { Node } from 'prosemirror-model'

const langExtensions: Record<string, () => unknown> = {
  javascript: () => javascript(),
  js: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  ts: () => javascript({ typescript: true }),
  java: () => java(),
  python: () => python(),
  py: () => python(),
  sql: () => sql(),
  css: () => css(),
  html: () => html(),
  json: () => json(),
  xml: () => xml(),
}

const cmDarkTheme = CmView.baseTheme({
  '.cm-editor': {
    fontSize: '14px',
    lineHeight: '1.5',
  },
  '.cm-editor.cm-focused': {
    outline: 'none',
  },
})

export class CodeBlockView implements NodeView {
  dom: HTMLElement
  private cm: CmView | null = null
  private lang: string
  private getPos: () => number | undefined
  private outerView: PmView
  private updating = false

  constructor(node: Node, view: PmView, getPos: () => number | undefined) {
    this.lang = node.attrs.lang || ''
    this.getPos = getPos
    this.outerView = view

    this.dom = document.createElement('div')
    this.dom.className = 'code-block-node'

    // Lang label
    if (this.lang) {
      const label = document.createElement('span')
      label.className = 'code-lang-label'
      label.textContent = this.lang
      label.contentEditable = 'false'
      this.dom.appendChild(label)
    }

    // Editor host
    const cmHost = document.createElement('div')
    cmHost.className = 'cm-host'
    this.dom.appendChild(cmHost)

    this.createCm(cmHost, node)
  }

  private createCm(host: HTMLElement, node: Node) {
    const langExt = langExtensions[this.lang]
    const extensions = [
      cmDarkTheme,
      CmView.editable.of(true),
      CmView.updateListener.of(update => {
        if (update.docChanged && !this.updating) {
          this.pushToProsemirror()
        }
      }),
    ]
    if (langExt) extensions.push(langExt() as never)

    this.cm = new CmView({
      doc: node.textContent,
      extensions,
      parent: host,
    })
  }

  private pushToProsemirror() {
    if (!this.cm) return
    const pos = this.getPos()
    if (pos == null) return
    const text = this.cm.state.doc.toString()
    const tr = this.outerView.state.tr
    const node = this.outerView.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'code_block') return

    // Replace text content
    const from = pos + 1 // after the opening of code_block
    const to = from + (node.textContent.length)
    this.outerView.dispatch(
      tr.replaceWith(from, to, this.outerView.state.schema.text(text))
    )
  }

  update(node: Node): boolean {
    if (!this.cm) return false
    const newText = node.textContent
    const newLang = (node.attrs.lang as string) || ''

    // Update language label
    const label = this.dom.querySelector('.code-lang-label')
    if (label) {
      label.textContent = newLang
    }

    if (newText !== this.cm.state.doc.toString()) {
      this.updating = true
      this.cm.dispatch({
        changes: {
          from: 0,
          to: this.cm.state.doc.length,
          insert: newText,
        },
      })
      this.updating = false
    }
    return true
  }

  destroy() {
    this.cm?.destroy()
    this.cm = null
  }

  // ProseMirror shouldn't handle events inside this node — CM takes over
  stopEvent(): boolean {
    return true
  }

  // Allow CM to handle selection
  ignoreMutation(): boolean {
    return true
  }
}
