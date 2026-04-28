import { keymap } from 'prosemirror-keymap'
import { TextSelection } from 'prosemirror-state'
import { schema } from '../schema'

export const headingEnterPlugin = keymap({
  Enter: (state, dispatch) => {
    const { $from } = state.selection
    const block = $from.node(-1)

    if (block.type !== schema.nodes.heading) return false
    if (!dispatch) return true

    const tr = state.tr
    const before = block.textContent.slice(0, $from.parentOffset)
    const after = block.textContent.slice($from.parentOffset)

    // Replace heading text with content before cursor
    const contentStart = $from.pos - $from.parentOffset
    tr.replaceWith(
      contentStart,
      contentStart + block.textContent.length,
      schema.text(before),
    )

    // Insert paragraph after the heading block
    const blockStart = contentStart - 1
    const insertAt = blockStart + block.nodeSize
    tr.insert(
      insertAt,
      schema.nodes.paragraph.create({}, after ? schema.text(after) : []),
    )

    // Move cursor into the new paragraph
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1)))

    dispatch(tr)
    return true
  },
})
