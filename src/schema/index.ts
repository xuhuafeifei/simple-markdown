import { Schema, type DOMOutputSpec, type Node, type Mark } from 'prosemirror-model'

const nodes = {
  doc: {
    content: 'block+',
  },

heading: {
    content: 'inline*',
    group: 'block',
    attrs: { level: { default: 1 } },
    defining: true,
    toDOM(node: Node): DOMOutputSpec {
      const tag = 'h' + node.attrs.level
      return [tag, 0]
    },
  },

  paragraph: {
    content: 'inline*',
    group: 'block',
    toDOM(): DOMOutputSpec { return ['p', 0] },
  },

  blockquote: {
    content: 'block+',
    group: 'block',
    toDOM(): DOMOutputSpec { return ['blockquote', 0] },
  },

  bullet_list: {
    content: 'list_item+',
    group: 'block',
    toDOM(): DOMOutputSpec { return ['ul', 0] },
  },

  ordered_list: {
    content: 'list_item+',
    group: 'block',
    attrs: { order: { default: 1 } },
    toDOM(): DOMOutputSpec { return ['ol', 0] },
  },

  task_list: {
    content: 'list_item+',
    group: 'block',
    toDOM(): DOMOutputSpec { return ['ul', { class: 'task-list' }, 0] },
  },

  list_item: {
    content: 'block+',
    attrs: { checked: { default: null } },
    toDOM(_node: Node): DOMOutputSpec {
      return ['li', 0]
    },
  },

  code_block: {
    content: 'text*',
    group: 'block',
    isolating: true,
    attrs: { lang: { default: '' } },
    toDOM(node: Node): DOMOutputSpec {
      return ['pre', ['code', { class: 'language-' + (node.attrs.lang || '') }, 0]]
    },
  },

  math_block: {
    content: 'text*',
    group: 'block',
    isolating: true,
    toDOM(): DOMOutputSpec { return ['pre', { class: 'math-block' }, 0] },
  },

  horizontal_rule: {
    group: 'block',
    toDOM(): DOMOutputSpec { return ['hr'] },
  },

  text: {
    group: 'inline',
  },

  inline_code: {
    content: 'text*',
    group: 'inline',
    inline: true,
    marks: '',
    toDOM(): DOMOutputSpec { return ['code', 0] },
  },

  inline_math: {
    content: 'text*',
    group: 'inline',
    inline: true,
    marks: '',
    toDOM(): DOMOutputSpec { return ['span', { class: 'math-inline' }, 0] },
  },

  image: {
    group: 'inline',
    inline: true,
    attrs: {
      src: {},
      alt: { default: '' },
      title: { default: '' },
    },
    toDOM(node: Node): DOMOutputSpec {
      const { src, alt, title } = node.attrs
      return ['img', { src, alt: alt || '', title: title || '' }]
    },
  },
}

const marks = {
  bold: {
    toDOM(): DOMOutputSpec { return ['strong', 0] },
  },
  italic: {
    toDOM(): DOMOutputSpec { return ['em', 0] },
  },
  strike: {
    toDOM(): DOMOutputSpec { return ['s', 0] },
  },
  color: {
    attrs: { value: { default: '' } },
    toDOM(mark: Mark): DOMOutputSpec {
      return ['span', { style: `color:${mark.attrs.value}` }, 0]
    },
  },
  link: {
    attrs: {
      href: {},
      title: { default: '' },
    },
    toDOM(mark: Mark): DOMOutputSpec {
      const { href, title } = mark.attrs
      return ['a', { href, title: title || '' }, 0]
    },
  },
}

export const schema = new Schema({ nodes, marks })
export type MarkdownSchema = typeof schema
