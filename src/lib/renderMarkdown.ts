import { marked, Renderer, type Tokens } from 'marked'
import DOMPurify from 'dompurify'
import { highlighterPromise } from './highlighter'

// `Tokens.Code` has no field for this — `walkTokens` (below) attaches it before
// the renderer (also below) reads it back synchronously.
interface HighlightedCodeToken extends Tokens.Code {
  highlighted?: string
}

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'del',
  'ul', 'ol', 'li',
  'a', 'code', 'pre', 'span',
  'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'input',
]
// `style` is required for Shiki's per-token colors (`<span style="color:...">`) —
// DOMPurify still strips any dangerous CSS (url(), expression(), etc.) inside it.
const ALLOWED_ATTR = ['href', 'class', 'type', 'checked', 'disabled', 'style']

// `marked`'s per-token renderer functions are called synchronously even when
// `options.async: true` — only `walkTokens` is actually awaited (verified
// empirically: an async `renderer.code` returning a Promise got string-
// concatenated as the literal text "[object Promise]", never awaited). Shiki's
// highlighting has to happen here instead, mutating each code token in place;
// the renderer below then just reads the value back out synchronously.
async function highlightCodeTokens(token: Tokens.Generic): Promise<void> {
  if (token.type !== 'code') return
  const codeToken = token as HighlightedCodeToken
  const highlighter = await highlighterPromise
  const language =
    codeToken.lang && highlighter.getLoadedLanguages().includes(codeToken.lang) ? codeToken.lang : 'text'
  codeToken.highlighted = highlighter.codeToHtml(codeToken.text, { lang: language, theme: 'dracula' })
}

const renderer = new Renderer()
// Falls back to marked's own default (plain, unstyled <pre><code>) if, for any
// reason, `highlighted` never got set — never throws, never leaves a code block
// silently empty.
renderer.code = (token) => (token as HighlightedCodeToken).highlighted ?? Renderer.prototype.code.call(renderer, token)

// `marked` does NOT escape raw HTML embedded in Markdown source — unlike a syntax
// highlighter (see notebooks' CodeBlock/Shiki, which escapes `<` at the tokenizer
// level), Markdown's own spec treats inline/block HTML as pass-through by design.
// Verified empirically: `marked.parse('<script>alert(1)</script>')` returns the
// `<script>` tag completely unescaped. That makes DOMPurify the PRIMARY defense
// here, not defense in depth — never call `marked.parse` and insert its output
// without sanitizing first.
//
// This is still a defensible use of `dangerouslySetInnerHTML` because the Markdown
// rendered here always originates from local `.md` files this app's own server
// discovers on disk (see discoverStories.ts) — never a remote fetch to a third
// party, user-typed form input, or anything else outside this app's control. If
// this module is ever pointed at content from a different origin, re-review this
// contract from scratch — sanitizing the OUTPUT does not make an untrusted INPUT
// source safe on its own.
export async function renderMarkdownToSafeHtml(markdown: string): Promise<string> {
  const html = await marked.parse(markdown, {
    async: true,
    renderer,
    walkTokens: highlightCodeTokens,
  })
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}
