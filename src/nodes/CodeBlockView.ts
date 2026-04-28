import { EditorView as CmView } from '@codemirror/view'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
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

const cmTheme = CmView.baseTheme({
  '.cm-editor': { fontSize: '14px', lineHeight: '1.5' },
  '.cm-editor.cm-focused': { outline: 'none' },
})

export class CodeBlockView implements NodeView {
  dom: HTMLElement
  private cm: CmView | null = null
  private lang: string
  private getPos: () => number | undefined
  private outerView: PmView
  private updating = false
  private langLabel!: HTMLElement

  constructor(node: Node, view: PmView, getPos: () => number | undefined) {
    this.lang = (node.attrs.lang as string) || ''
    this.getPos = getPos
    this.outerView = view

    this.dom = document.createElement('div')
    this.dom.className = 'code-block-node'

    // Toolbar with language label
    const toolbar = document.createElement('div')
    toolbar.className = 'code-block-toolbar'
    toolbar.contentEditable = 'false'

    this.langLabel = document.createElement('span')
    this.langLabel.className = 'code-lang-label'
    this.langLabel.textContent = this.lang || 'text'
    this.langLabel.title = 'Click to change language'
    this.langLabel.addEventListener('click', (e) => {
      e.stopPropagation()
      this.promptSwitchLang()
    })

    const copyBtn = document.createElement('button')
    copyBtn.textContent = 'Lang'
    copyBtn.title = 'Switch language'
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.promptSwitchLang()
    })

    toolbar.appendChild(this.langLabel)
    toolbar.appendChild(copyBtn)
    this.dom.appendChild(toolbar)

    // CodeMirror host
    const cmHost = document.createElement('div')
    cmHost.className = 'cm-host'
    this.dom.appendChild(cmHost)

    this.createCm(cmHost, node)
  }

  private promptSwitchLang() {
    const newLang = prompt('Language:', this.lang)
    if (newLang == null) return
    const lang = newLang.trim()

    const pos = this.getPos()
    if (pos == null) return

    // Update ProseMirror attribute — update() will be called with the new lang
    // update() will be called with the new lang and handle CM rebuild
    const tr = this.outerView.state.tr.setNodeAttribute(pos, 'lang', lang)
    this.outerView.dispatch(tr)
  }

  private rebuildCm() {
    const prevText = this.cm ? this.cm.state.doc.toString() : ''
    if (this.cm) {
      const host = this.cm.dom.parentElement!
      this.cm.destroy()
      host.innerHTML = ''
      this.cm = null
      // Use a dummy node to pass text to createCm
      this.createCm(host, { textContent: prevText } as Node)
    }
  }

  private createCm(host: HTMLElement, node: Node) {
    const langExt = langExtensions[this.lang]
    const extensions = [
      cmTheme,
      syntaxHighlighting(defaultHighlightStyle),
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

    const node = this.outerView.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'code_block') return

    const from = pos + 1
    const to = from + node.textContent.length
    this.outerView.dispatch(
      this.outerView.state.tr.replaceWith(from, to, this.outerView.state.schema.text(text)),
    )
  }

  update(node: Node): boolean {
    const newText = node.textContent
    const newLang = (node.attrs.lang as string) || ''

    if (newLang !== this.lang || !this.cm) {
      // Language changed or CM not ready — rebuild
      this.lang = newLang
      this.langLabel.textContent = newLang || 'text'
      this.rebuildCm()
      return true
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

  stopEvent(): boolean {
    return true
  }

  ignoreMutation(): boolean {
    return true
  }
}
