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
})
