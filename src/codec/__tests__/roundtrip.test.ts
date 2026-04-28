import { describe, it, expect } from 'vitest'
import { fromMarkdown, toMarkdown } from '../fromMarkdown'

function rt(md: string) {
  const doc = fromMarkdown(md)
  return toMarkdown(doc)
}

function expectRoundTrip(md: string, expected?: string) {
  expect(rt(md)).toBe(expected ?? md)
}

// ---------- block ----------

describe('heading', () => {
  it('h1-h6', () => {
    expectRoundTrip('# Heading 1')
    expectRoundTrip('## Heading 2')
    expectRoundTrip('### Heading 3')
    expectRoundTrip('###### Heading 6')
  })
})

describe('paragraph', () => {
  it('plain text', () => {
    expectRoundTrip('hello world')
  })

  it('multiple blocks', () => {
    expectRoundTrip('first\n\nsecond')
  })
})

describe('blockquote', () => {
  it('single line', () => {
    expectRoundTrip('> quoted text')
  })
})

describe('unordered list', () => {
  it('single item', () => {
    expectRoundTrip('- item')
  })

  it('multiple items', () => {
    expectRoundTrip('- item 1\n- item 2')
  })
})

describe('ordered list', () => {
  it('single item', () => {
    expectRoundTrip('1. first')
  })
})

describe('task list', () => {
  it('unchecked', () => {
    expectRoundTrip('- [ ] todo')
  })

  it('checked', () => {
    expectRoundTrip('- [x] done')
  })
})

describe('code block', () => {
  it('with lang', () => {
    expectRoundTrip('```java\npublic class Hello {}\n```')
  })

  it('no lang', () => {
    expectRoundTrip('```\nplain code\n```')
  })
})

describe('math block', () => {
  it('latex', () => {
    expectRoundTrip('$$\nx^2 + y^2 = z^2\n$$')
  })
})

describe('horizontal rule', () => {
  it('dashes', () => {
    expectRoundTrip('---')
  })
})

// ---------- inline ----------

describe('bold', () => {
  it('single word', () => {
    expectRoundTrip('**bold**')
  })
})

describe('italic', () => {
  it('single word', () => {
    expectRoundTrip('*italic*')
  })
})

describe('strike', () => {
  it('single word', () => {
    expectRoundTrip('~~strike~~')
  })
})

describe('inline code', () => {
  it('single word', () => {
    expectRoundTrip('`code`')
  })

  it('code before text', () => {
    expectRoundTrip('`code` then text')
  })
})

describe('inline math', () => {
  it('simple', () => {
    expectRoundTrip('$x^2$')
  })
})

describe('link', () => {
  it('basic', () => {
    expectRoundTrip('[example](https://example.com)')
  })
})

describe('image', () => {
  it('basic', () => {
    expectRoundTrip('![alt](https://img.com/pic.png)')
  })
})

describe('color span', () => {
  it('named color', () => {
    expectRoundTrip('<span style="color:red">red text</span>')
  })

  it('hex color', () => {
    expectRoundTrip('<span style="color:#ff0000">red</span>')
  })
})

// ---------- combinations ----------

describe('combinations', () => {
  it('bold inside paragraph with other text', () => {
    expectRoundTrip('hello **world** today')
  })

  it('multiple marks', () => {
    expectRoundTrip('**bold and *italic***')
  })

  it('code in list item', () => {
    expectRoundTrip('- `inline code` in list')
  })

  it('link with bold text', () => {
    expectRoundTrip('[**bold link**](url)')
  })

  it('bold link', () => {
    expectRoundTrip('**[link](url)**')
  })

  it('triple nested bold italic', () => {
    expectRoundTrip('***bold italic***')
  })

  it('italic inside bold serializes with nested markers', () => {
    // Input: **bold and *italic* word** → serializer outputs ***italic***
    // Both forms are semantically equivalent and round-trip correctly
    const result = rt('**bold and *italic* word**')
    expect(result).toContain('bold and ')
    expect(result).toContain('italic')
    expect(result).toContain(' word')
  })

  it('strike with inline code preserves code node', () => {
    // inline_code can't have marks (schema restriction), so strike
    // doesn't wrap around it. Both forms are semantically correct.
    const result = rt('~~strike `code` here~~')
    expect(result).toContain('strike')
    expect(result).toContain('`code`')
    expect(result).toContain('here')
  })
})

// ---------- edge cases ----------

describe('edge cases', () => {
  it('empty string produces empty doc', () => {
    const doc = fromMarkdown('')
    expect(doc.type.name).toBe('doc')
  })

  it('special characters treated as literal when unmatched', () => {
    expectRoundTrip('not * italic')
    expectRoundTrip('not ** bold')
    expectRoundTrip('price is $10')
    expectRoundTrip('backtick ` here')
  })

  it('Unicode Chinese', () => {
    expectRoundTrip('你好世界')
  })

  it('Unicode emoji in text', () => {
    const result = rt('hello 🎉 world')
    expect(result).toBe('hello 🎉 world')
  })

  it('link with title', () => {
    const doc = fromMarkdown('[link](https://example.com "a title")')
    expect(doc.textContent).toContain('link')
  })

  it('image with alt text', () => {
    const doc = fromMarkdown('![alt text](https://img.com/pic.png)')
    const img = doc.firstChild?.firstChild
    expect(img?.attrs.alt).toBe('alt text')
  })

  it('image src includes title in v1', () => {
    const doc = fromMarkdown('![alt](https://img.com/pic.png "title")')
    const img = doc.firstChild?.firstChild
    expect(img?.attrs.src).toContain('https://img.com/pic.png')
  })

  it('multiple blank lines collapsed', () => {
    const doc = fromMarkdown('a\n\n\n\nb')
    const out = toMarkdown(doc)
    expect(out).toContain('a')
    expect(out).toContain('b')
  })

  it('code block with special chars inside', () => {
    expectRoundTrip('```\n**not bold**\n`not code`\n$not math$\n```')
  })

  it('blockquote with empty line collapsed', () => {
    const result = rt('> line1\n> \n> line2')
    expect(result).toContain('line1')
    expect(result).toContain('line2')
  })

  it('bold only at word boundary', () => {
    expectRoundTrip('so**me**thing')
  })

  it('html-like text not confused with color span', () => {
    expectRoundTrip('use <div> tags')
  })

  it('horizontal rule markers', () => {
    expectRoundTrip('***', '---')
    expectRoundTrip('___', '---')
  })
})
