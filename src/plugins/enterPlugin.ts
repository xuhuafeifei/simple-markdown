import { keymap } from 'prosemirror-keymap'
import { schema } from '../schema'

/**
 * Enter always splits the current block and creates a new paragraph after it.
 * For headings and top-level textblocks, this prevents heading continuation
 * (e.g. Enter in h1 → new h1). Lists are excluded — they use the default
 * baseKeymap behavior (Enter splits list items).
 * Code blocks and math blocks are also excluded (they handle Enter internally).
 */
export const enterPlugin = keymap({
  Enter: (state, dispatch) => {
    const { $from } = state.selection
    const block = $from.parent
    if (!block.type.isTextblock) return false
    // Skip code_block and math_block — they handle Enter internally
    if (block.type === schema.nodes.code_block) return false
    if (block.type === schema.nodes.math_block) return false
    // Skip lists — let baseKeymap split list items
    if ($from.node($from.depth - 1)?.type.name === 'list_item') return false
    if (!dispatch) return true

    dispatch(state.tr.split($from.pos, 1, [{ type: schema.nodes.paragraph }]))
    return true
  },
})
