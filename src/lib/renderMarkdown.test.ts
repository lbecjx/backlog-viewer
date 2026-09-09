import { describe, expect, it } from 'vitest'
import { renderMarkdownToSafeHtml } from './renderMarkdown'

describe('renderMarkdownToSafeHtml', () => {
  it('renders headings, bold, and lists to HTML', async () => {
    const html = await renderMarkdownToSafeHtml('## Título\n\n**importante**\n\n- uno\n- dos')
    expect(html).toContain('<h2>Título</h2>')
    expect(html).toContain('<strong>importante</strong>')
    expect(html).toContain('<li>uno</li>')
  })

  it('renders GFM task list checkboxes as disabled inputs', async () => {
    const html = await renderMarkdownToSafeHtml('- [x] hecho\n- [ ] pendiente')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked')
    expect(html).toContain('disabled')
  })

  it('renders fenced code blocks through Shiki, with real per-token color spans', async () => {
    const html = await renderMarkdownToSafeHtml('```ts\nconst x = 1\n```')
    expect(html).toContain('class="shiki')
    expect(html).toContain('<span style=')
  })

  it('falls back to plain text (no crash) for a language that was not loaded', async () => {
    const html = await renderMarkdownToSafeHtml('```cobol\nDISPLAY "hi".\n```')
    expect(html).toContain('DISPLAY')
    expect(html).toContain('class="shiki')
  })

  // `marked` passes raw HTML through unescaped by design (verified empirically —
  // see the comment in renderMarkdown.ts) — so unlike the Shiki/CodeBlock case in
  // notebooks, THIS test genuinely discriminates: it fails if sanitization is
  // removed, because marked itself does nothing to stop the script tag.
  it('strips a literal <script> tag embedded in the Markdown source', async () => {
    const html = await renderMarkdownToSafeHtml('texto normal <script>alert(1)</script> más texto')
    expect(html).not.toContain('<script')
    expect(html).toContain('texto normal')
    expect(html).toContain('más texto')
  })

  it('strips disallowed attributes like onerror from raw HTML in the source', async () => {
    const html = await renderMarkdownToSafeHtml('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<img')
  })

  it('keeps a real link from the Markdown source', async () => {
    const html = await renderMarkdownToSafeHtml('[texto](https://example.com)')
    expect(html).toContain('href="https://example.com"')
  })
})
