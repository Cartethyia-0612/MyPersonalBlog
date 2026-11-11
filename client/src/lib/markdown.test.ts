import { describe, expect, it } from 'vitest'

import { renderMarkdown, stripMarkdown } from './markdown'

describe('markdown rendering', () => {
  it('renders headings, lists and highlighted code', () => {
    const html = renderMarkdown('# 标题\n\n- 一\n- 二\n\n```ts\nconst answer = 42\n```')
    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('<li>一</li>')
    expect(html).toContain('class="hljs"')
  })

  it('escapes raw HTML and strips script injection', () => {
    const html = renderMarkdown('<script>alert("xss")</script>\n\n**安全**')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<strong>安全</strong>')
  })

  it('rejects javascript: links but keeps http links safe', () => {
    const unsafe = renderMarkdown('[点击](javascript:alert(1))')
    // markdown-it refuses to create a link for unsafe protocols; it is rendered
    // as plain text. The important guarantee is that no anchor is produced.
    expect(unsafe).not.toContain('<a')
    expect(unsafe).not.toContain('href="javascript')

    const external = renderMarkdown('[外部](https://example.com)')
    expect(external).toContain('target="_blank"')
    expect(external).toContain('rel="noopener noreferrer"')
  })

  it('can strip markdown for summaries', () => {
    expect(stripMarkdown('# 标题\n\n这是 **内容**')).toBe('标题 这是 内容')
  })
})
