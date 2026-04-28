import { Plugin } from 'prosemirror-state'
import { schema } from '../schema'

export const imagePastePlugin = new Plugin({
  props: {
    handleDOMEvents: {
      paste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) continue

            const reader = new FileReader()
            reader.onload = () => {
              const src = reader.result as string
              const pos = view.state.selection.from
              view.dispatch(view.state.tr.insert(pos, schema.nodes.image.create({ src })))
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },

      drop(view, event) {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (imageFiles.length === 0) return false

        event.preventDefault()

        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
        const insertPos = pos?.pos ?? view.state.selection.from

        for (const file of imageFiles) {
          const reader = new FileReader()
          reader.onload = () => {
            const src = reader.result as string
            view.dispatch(view.state.tr.insert(insertPos, schema.nodes.image.create({ src })))
          }
          reader.readAsDataURL(file)
        }
        return true
      },
    },
  },
})
