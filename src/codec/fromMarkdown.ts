import { schema } from '../schema'
import type { Node } from 'prosemirror-model'

// ---------- block parsing ----------

function splitBlocks(text: string): string[] {
  const blocks: string[] = []
  let current = ''
  let inFence = false
  let inMathBlock = false
  let fenceMarker = ''

  const lines = text.split('\n')
  for (const line of lines) {
    // fenced code block
    if (!inMathBlock && (line.startsWith('```') || line.startsWith('~~~'))) {
      if (!inFence) {
        // opening fence
        if (current) { blocks.push(current); current = '' }
        inFence = true
        fenceMarker = line.slice(0, 3)
        current = line
      } else if (line.startsWith(fenceMarker) && !line.slice(3).trim()) {
        // closing fence
        current += '\n' + line
        blocks.push(current)
        current = ''
        inFence = false
        fenceMarker = ''
      } else {
        current += '\n' + line
      }
      continue
    }

    if (inFence) {
      current += '\n' + line
      continue
    }

    // math block
    if (line.startsWith('$$')) {
      if (!inMathBlock) {
        if (current) { blocks.push(current); current = '' }
        inMathBlock = true
        current = line
      } else {
        current += '\n' + line
        blocks.push(current)
        current = ''
        inMathBlock = false
      }
      continue
    }

    if (inMathBlock) {
      current += '\n' + line
      continue
    }

    // blank line = block separator
    if (line.trim() === '') {
      if (current) { blocks.push(current); current = '' }
      continue
    }

    current = current ? current + '\n' + line : line
  }

  if (current) blocks.push(current)
  return blocks
}

function parseBlock(block: string): Node {
  // fenced code block
  if (block.startsWith('```') || block.startsWith('~~~')) {
    return parseCodeBlock(block)
  }

  // math block
  if (block.startsWith('$$')) {
    return parseMathBlock(block)
  }

  const lines = block.split('\n')

  // empty
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    return schema.nodes.paragraph.create({}, [schema.text('')])
  }

  // ATX heading
  const headingMatch = lines[0].match(/^(#{1,6})\s+(.+)/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const inlines = parseInlines(headingMatch[2])
    return schema.nodes.heading.create({ level }, inlines)
  }

  // horizontal rule
  if (/^-{3,}$/.test(lines[0].trim()) || /^\*{3,}$/.test(lines[0].trim()) || /^_{3,}$/.test(lines[0].trim())) {
    return schema.nodes.horizontal_rule.create()
  }

  // blockquote
  if (lines[0].startsWith('> ')) {
    return parseBlockquote(block)
  }

  // list
  if (isListItem(lines[0])) {
    return parseList(block)
  }

  // paragraph
  return schema.nodes.paragraph.create({}, parseInlines(block))
}

// ---------- code block ----------

function parseCodeBlock(block: string): Node {
  const lines = block.split('\n')
  const opener = lines[0]
  const langMatch = opener.match(/^`{3,}|~{3,}/)
  const lang = opener.slice(langMatch ? langMatch[0].length : 3).trim() || ''
  // skip first and last line (fence markers)
  const text = lines.slice(1, -1).join('\n')
  return schema.nodes.code_block.create({ lang }, text ? schema.text(text) : [])
}

// ---------- math block ----------

function parseMathBlock(block: string): Node {
  const lines = block.split('\n')
  // skip $$ lines
  const text = lines.slice(1, -1).join('\n')
  return schema.nodes.math_block.create({}, text ? schema.text(text) : [])
}

// ---------- blockquote ----------

function parseBlockquote(block: string): Node {
  const lines = block.split('\n')
  const content = lines.map(l => {
    if (l.startsWith('> ')) return l.slice(2)
    if (l.startsWith('>')) return l.slice(1)
    return l
  }).join('\n')
  const blocks = splitBlocks(content)
  return schema.nodes.blockquote.create({}, blocks.map(parseBlock))
}

// ---------- list ----------

function isListItem(line: string): boolean {
  return /^(\s*)([-*+]|\d+\.)\s/.test(line) || /^(\s*)[-*+]\s\[[ x]\]\s/.test(line)
}

function parseList(block: string): Node {
  const lines = block.split('\n')
  const items: { indent: number; marker: string; content: string; checked: boolean | null }[] = []

  for (const line of lines) {
    const match = line.match(/^(\s*)([-*+]|\d+\.|[-*+]\s\[[ x]\])\s(.*)/)
    if (!match) continue
    const indent = match[1].length
    const marker = match[2]
    const checked = marker.includes('[') ? marker.includes('[x]') : null
    items.push({ indent, marker, content: match[3], checked })
  }

  // Determine list type from first item
  const first = items[0]
  const isOrdered = /^\d+\.$/.test(first.marker)
  const isTask = first.checked !== null

  // Build tree: group by indent level
  return buildListTree(items, isOrdered, isTask)
}

function buildListTree(
  items: { indent: number; content: string; checked: boolean | null }[],
  isOrdered: boolean,
  isTask: boolean,
): Node {
  // v1: flatten all items, ignore indentation nesting
  const listItems: Node[] = items.map(item => {
    const children = parseListItemContent(item.content)
    return schema.nodes.list_item.create({ checked: item.checked }, children)
  })

  const listType = isTask ? schema.nodes.task_list
    : isOrdered ? schema.nodes.ordered_list
    : schema.nodes.bullet_list

  const attrs = isOrdered ? { order: 1 } : {}
  return listType.create(attrs, listItems)
}

function parseListItemContent(content: string): Node[] {
  // Check if content ends with a fenced code block marker
  const codeBlockStart = content.indexOf('\n```')
  if (codeBlockStart !== -1) {
    const before = content.slice(0, codeBlockStart).trim()
    const codeBlockText = content.slice(codeBlockStart + 1)
    const codeNode = parseCodeBlock(codeBlockText)
    if (before) {
      return [schema.nodes.paragraph.create({}, parseInlines(before)), codeNode]
    }
    return [codeNode]
  }
  return [schema.nodes.paragraph.create({}, parseInlines(content))]
}

// ---------- inline parsing ----------

function parseInlines(text: string): Node[] {
  const nodes: Node[] = []
  let i = 0

  while (i < text.length) {
    // inline code: `...`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        const codeText = text.slice(i + 1, end)
        nodes.push(schema.nodes.inline_code.create({}, schema.text(codeText)))
        i = end + 1
        continue
      }
    }

    // inline math: $...$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end !== -1) {
        const mathText = text.slice(i + 1, end)
        nodes.push(schema.nodes.inline_math.create({}, schema.text(mathText)))
        i = end + 1
        continue
      }
    }

    // image: ![alt](url)
    if (text.startsWith('![')) {
      const closeBracket = text.indexOf(']', i + 2)
      const openParen = text.indexOf('(', closeBracket)
      const closeParen = text.indexOf(')', openParen)
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        const alt = text.slice(i + 2, closeBracket)
        const src = text.slice(openParen + 1, closeParen)
        nodes.push(schema.nodes.image.create({ src, alt: alt || '' }))
        i = closeParen + 1
        continue
      }
    }

    // link: [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1)
      const openParen = text.indexOf('(', closeBracket)
      const closeParen = text.indexOf(')', openParen)
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        const linkText = text.slice(i + 1, closeBracket)
        const href = text.slice(openParen + 1, closeParen)
        const linkChildren = parseInlines(linkText)
        const linkMark = schema.marks.link.create({ href })
        // apply link mark to children
        for (const child of linkChildren) {
          if (child.type === schema.nodes.text) {
            const marks = [...child.marks, linkMark]
            nodes.push(child.mark(marks))
          } else {
            nodes.push(child)
          }
        }
        i = closeParen + 1
        continue
      }
    }

    // bold: **text**
    if (text.startsWith('**')) {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        const boldText = text.slice(i + 2, end)
        const innerNodes = parseInlines(boldText)
        for (const node of innerNodes) {
          if (node.type === schema.nodes.text) {
            nodes.push(node.mark([...node.marks, schema.marks.bold.create()]))
          } else {
            nodes.push(node)
          }
        }
        i = end + 2
        continue
      }
    }

    // italic: *text* (but not **)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1)
      if (end !== -1) {
        const italicText = text.slice(i + 1, end)
        const innerNodes = parseInlines(italicText)
        for (const node of innerNodes) {
          if (node.type === schema.nodes.text) {
            nodes.push(node.mark([...node.marks, schema.marks.italic.create()]))
          } else {
            nodes.push(node)
          }
        }
        i = end + 1
        continue
      }
    }

    // strike: ~~text~~
    if (text.startsWith('~~')) {
      const end = text.indexOf('~~', i + 2)
      if (end !== -1) {
        const strikeText = text.slice(i + 2, end)
        const innerNodes = parseInlines(strikeText)
        for (const node of innerNodes) {
          if (node.type === schema.nodes.text) {
            nodes.push(node.mark([...node.marks, schema.marks.strike.create()]))
          } else {
            nodes.push(node)
          }
        }
        i = end + 2
        continue
      }
    }

    // color: <span style="color:...">text</span>
    if (text.startsWith('<span')) {
      const styleMatch = text.slice(i).match(/^<span\s+style="color:\s*([^">]+)">/)
      const closeTag = text.indexOf('</span>', i)
      if (styleMatch && closeTag !== -1) {
        const colorValue = styleMatch[1].trim()
        const innerStart = i + styleMatch[0].length
        const innerText = text.slice(innerStart, closeTag)
        const innerNodes = parseInlines(innerText)
        const colorMark = schema.marks.color.create({ value: colorValue })
        for (const node of innerNodes) {
          if (node.type === schema.nodes.text) {
            nodes.push(node.mark([...node.marks, colorMark]))
          } else {
            nodes.push(node)
          }
        }
        i = closeTag + 7 // </span>
        continue
      }
    }

    // plain text: collect until next special char
    let j = i
    while (j < text.length && !'`$![*~<'.includes(text[j])) {
      j++
    }
    if (j > i) {
      nodes.push(schema.text(text.slice(i, j)))
      i = j
    } else if (j < text.length) {
      // special char but nothing matched above — treat as literal
      nodes.push(schema.text(text[i]))
      i++
    }
  }

  return nodes
}

// ---------- public API ----------

export function fromMarkdown(text: string): Node {
  const blocks = splitBlocks(text)
  const blockNodes = blocks.map(parseBlock)
  return schema.nodes.doc.create({}, blockNodes)
}

export function toMarkdown(doc: Node): string {
  return doc.content.toJSON() ? serializeNodes(doc) : ''
}

function serializeNodes(node: Node): string {
  if (node.type === schema.nodes.doc) {
    return node.content.toJSON()
      ? node.content.content.map((n: Node) => serializeNode(n)).filter(Boolean).join('\n\n')
      : ''
  }
  return serializeNode(node)
}

function serializeNode(node: Node): string {
  switch (node.type) {
    case schema.nodes.heading:
      return '#'.repeat(node.attrs.level) + ' ' + serializeInlines(node)
    case schema.nodes.paragraph:
      return serializeInlines(node)
    case schema.nodes.blockquote:
      return '> ' + node.content.content.map((n: Node) => serializeNode(n)).join('\n> ')
    case schema.nodes.code_block:
      return '```' + (node.attrs.lang || '') + '\n' + node.textContent + '\n```'
    case schema.nodes.math_block:
      return '$$\n' + node.textContent + '\n$$'
    case schema.nodes.horizontal_rule:
      return '---'
    case schema.nodes.bullet_list:
    case schema.nodes.ordered_list:
    case schema.nodes.task_list:
      return serializeListItems(node)
    default:
      return node.textContent
  }
}

function serializeListItems(listNode: Node): string {
  return listNode.content.content.map((item: Node) => {
    const prefix = listNode.type === schema.nodes.ordered_list ? '1. '
      : listNode.type === schema.nodes.task_list
        ? (item.attrs.checked ? '- [x] ' : '- [ ] ')
      : '- '
    return serializeListItem(item, prefix)
  }).join('\n')
}

function serializeListItem(item: Node, prefix: string, indent = ''): string {
  const children: Node[] = item.content.content as Node[]
  let result = ''
  let first = true

  for (const child of children) {
    const serialized = serializeNode(child)
    if (first) {
      result += indent + prefix + serialized
      first = false
    } else {
      if (child.type === schema.nodes.code_block || child.type === schema.nodes.bullet_list || child.type === schema.nodes.ordered_list) {
        result += '\n' + indent + '  ' + serialized.split('\n').join('\n' + indent + '  ')
      } else {
        result += '\n' + indent + '  ' + serialized
      }
    }
  }
  return result
}

function serializeInlines(node: Node): string {
  if (!node.content || node.content.childCount === 0) return ''

  let result = ''
  node.content.forEach((child: Node) => {
    result += serializeInline(child)
  })
  return result
}

function serializeInline(node: Node): string {
  if (node.type === schema.nodes.text) {
    let text = node.text || ''
    for (const mark of node.marks) {
      if (mark.type === schema.marks.link) text = `[${text}](${mark.attrs.href})`
      else if (mark.type === schema.marks.bold) text = `**${text}**`
      else if (mark.type === schema.marks.italic) text = `*${text}*`
      else if (mark.type === schema.marks.strike) text = `~~${text}~~`
      else if (mark.type === schema.marks.color) text = `<span style="color:${mark.attrs.value}">${text}</span>`
    }
    return text
  }
  if (node.type === schema.nodes.inline_code) {
    return '`' + node.textContent + '`'
  }
  if (node.type === schema.nodes.inline_math) {
    return '$' + node.textContent + '$'
  }
  if (node.type === schema.nodes.image) {
    return '![' + (node.attrs.alt || '') + '](' + node.attrs.src + ')'
  }
  return node.textContent
}
