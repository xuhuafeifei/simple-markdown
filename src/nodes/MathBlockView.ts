import katex from 'katex'
import type { EditorView as PmView } from 'prosemirror-view'
import type { Node } from 'prosemirror-model'

export class MathBlockView {
  dom: HTMLElement
  private text: string
  private getPos: () => number | undefined
  private outerView: PmView
  private editing = false
  private editorEl!: HTMLPreElement
  private renderEl!: HTMLElement

  constructor(node: Node, view: PmView, getPos: () => number | undefined) {
    this.text = node.textContent
    this.getPos = getPos
    this.outerView = view

    this.dom = document.createElement('div')
    this.dom.className = 'math-block-node'

    // Editor (contenteditable)
    this.editorEl = document.createElement('pre')
    this.editorEl.className = 'math-block-edit'
    this.editorEl.contentEditable = 'true'
    this.editorEl.textContent = this.text
    this.editorEl.spellcheck = false
    this.editorEl.addEventListener('input', () => this.handleInput())
    this.editorEl.addEventListener('blur', () => this.render())
    this.editorEl.addEventListener('focus', () => {
      this.editing = true
    })
    this.dom.appendChild(this.editorEl)

    // Render display (hidden initially)
    this.renderEl = document.createElement('div')
    this.renderEl.className = 'math-block-render'
    this.renderEl.style.display = 'none'
    this.renderEl.addEventListener('click', () => this.showEdit())
    this.dom.appendChild(this.renderEl)

    // Auto-render on init if there's content
    if (this.text.trim()) {
      this.render()
    }
  }

  private handleInput() {
    const newText = this.editorEl.textContent || ''
    this.text = newText
    this.pushToProsemirror()
  }

  private render() {
    this.editing = false
    if (!this.text.trim()) {
      this.renderEl.innerHTML = ''
      this.renderEl.style.display = 'none'
      this.editorEl.style.display = ''
      return
    }

    try {
      const html = katex.renderToString(this.text, {
        displayMode: true,
        throwOnError: true,
      })
      this.renderEl.innerHTML = html
      this.renderEl.style.display = ''
      this.editorEl.style.display = 'none'
    } catch {
      // Render failed — keep showing editor
      this.renderEl.style.display = 'none'
      this.editorEl.style.display = ''
    }
  }

  private showEdit() {
    this.editing = true
    this.renderEl.style.display = 'none'
    this.editorEl.style.display = ''
    this.editorEl.focus()
  }

  private pushToProsemirror() {
    const pos = this.getPos()
    if (pos == null) return

    const node = this.outerView.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'math_block') return

    const from = pos + 1
    const to = from + node.textContent.length
    this.outerView.dispatch(
      this.outerView.state.tr.replaceWith(
        from, to, this.outerView.state.schema.text(this.text),
      ),
    )
  }

  update(node: Node): boolean {
    const newText = node.textContent
    if (newText !== this.text) {
      this.text = newText
      this.editorEl.textContent = newText
      if (!this.editing) {
        this.render()
      }
    }
    return true
  }

  destroy() {
    // cleanup
  }

  stopEvent(event: Event): boolean {
    // Allow clicks on render area to trigger edit
    if (event.type === 'mousedown' && event.target === this.renderEl) {
      this.showEdit()
      return true
    }
    // Don't stop events in editor
    if (this.editing) return false
    return true
  }

  ignoreMutation(): boolean {
    return true
  }
}
