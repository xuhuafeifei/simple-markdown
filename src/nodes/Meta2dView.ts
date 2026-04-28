import { EditorView as CmView } from '@codemirror/view'
import { generateSvgPreview, releasePreviewResources } from '../renderers/meta2d/renderEngine'
import type { EditorView as PmView } from 'prosemirror-view'
import type { Node } from 'prosemirror-model'

export class Meta2dView {
  dom: HTMLElement
  private cm: CmView | null = null
  private mode: 'edit' | 'render' = 'edit'
  private text: string
  private getPos: () => number | undefined
  private outerView: PmView
  private updating = false
  private renderHost!: HTMLElement
  private cmHost!: HTMLElement
  private toggleBtn!: HTMLButtonElement

  constructor(node: Node, view: PmView, getPos: () => number | undefined) {
    this.text = node.textContent
    this.getPos = getPos
    this.outerView = view

    this.dom = document.createElement('div')
    this.dom.className = 'meta2d-node'

    // Toolbar
    const toolbar = document.createElement('div')
    toolbar.className = 'meta2d-toolbar'
    toolbar.contentEditable = 'false'

    const label = document.createElement('span')
    label.className = 'meta2d-label'
    label.textContent = 'meta2d'

    this.toggleBtn = document.createElement('button')
    this.toggleBtn.textContent = 'Preview'
    this.toggleBtn.addEventListener('click', () => this.toggleMode())

    toolbar.appendChild(label)
    toolbar.appendChild(this.toggleBtn)
    this.dom.appendChild(toolbar)

    // Editor host
    this.cmHost = document.createElement('div')
    this.cmHost.className = 'meta2d-edit-host'
    this.dom.appendChild(this.cmHost)

    // Render host (hidden initially)
    this.renderHost = document.createElement('div')
    this.renderHost.className = 'meta2d-render-host'
    this.renderHost.style.display = 'none'
    this.dom.appendChild(this.renderHost)

    this.createCm()
  }

  private createCm() {
    this.cm = new CmView({
      doc: this.text,
      extensions: [
        CmView.editable.of(true),
        CmView.updateListener.of(update => {
          if (update.docChanged && !this.updating) {
            this.pushToProsemirror()
          }
        }),
      ],
      parent: this.cmHost,
    })
  }

  private toggleMode() {
    if (this.mode === 'edit') {
      this.render()
    } else {
      this.showEdit()
    }
  }

  private render() {
    if (!this.text.trim()) return

    try {
      // Validate JSON first
      JSON.parse(this.text)

      generateSvgPreview(this.text, (svg: string, _width: number) => {
        if (!svg) {
          this.showEdit()
          return
        }
        this.renderHost.innerHTML = ''
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const img = document.createElement('img')
        img.src = url
        img.style.maxWidth = '100%'
        img.dataset.objectUrl = url
        this.renderHost.appendChild(img)

        this.renderHost.style.display = ''
        this.cmHost.style.display = 'none'
        this.toggleBtn.textContent = 'Edit'
        this.mode = 'render'
      })
    } catch {
      // Invalid JSON or render failed — stay in edit mode
    }
  }

  private showEdit() {
    releasePreviewResources(this.renderHost)
    this.renderHost.innerHTML = ''
    this.renderHost.style.display = 'none'
    this.cmHost.style.display = ''
    this.toggleBtn.textContent = 'Preview'
    this.mode = 'edit'
  }

  private pushToProsemirror() {
    if (!this.cm) return
    const pos = this.getPos()
    if (pos == null) return
    const newText = this.cm.state.doc.toString()
    this.text = newText

    const node = this.outerView.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'code_block') return

    const from = pos + 1
    const to = from + node.textContent.length
    this.outerView.dispatch(
      this.outerView.state.tr.replaceWith(
        from, to, this.outerView.state.schema.text(newText),
      ),
    )
  }

  update(node: Node): boolean {
    const newText = node.textContent
    if (newText !== this.text) {
      this.text = newText
      if (this.cm) {
        this.updating = true
        this.cm.dispatch({
          changes: { from: 0, to: this.cm.state.doc.length, insert: newText },
        })
        this.updating = false
      }
    }
    return true
  }

  destroy() {
    releasePreviewResources(this.renderHost)
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
