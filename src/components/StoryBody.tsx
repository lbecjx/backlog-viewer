import { useEffect, useState } from 'react'
import { formatFriendlyDateTimes } from '../lib/formatDateTime'
import { renderMarkdownToSafeHtml } from '../lib/renderMarkdown'

export function StoryBody({ body }: { body: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Raw ISO UTC datetimes (only ever appearing in a `## History` line,
    // per /local-backlog:update-status's format) become human-readable
    // before rendering — the stored value has to stay technical/unambiguous,
    // but showing it to a human as-is defeats the point of formatting it at all.
    renderMarkdownToSafeHtml(formatFriendlyDateTimes(body)).then((rendered) => {
      if (!cancelled) setHtml(rendered)
    })
    return () => {
      cancelled = true
    }
  }, [body])

  if (html === null) {
    return <p className="text-neutral-400 dark:text-neutral-500 text-sm">Rendering…</p>
  }

  return (
    // html comes from renderMarkdownToSafeHtml — sanitized with DOMPurify before
    // reaching this point; see the contract documented in lib/renderMarkdown.ts.
    // Checked task-list items (`- [x] ...`) get struck through — an established
    // convention for completed checklist items (Trello, Obsidian, GFM task lists).
    // Scoped to `li:has(checked checkbox)`, not the whole document.
    <div
      className="prose prose-sm dark:prose-invert max-w-none [&_li:has(>input:checked)]:line-through [&_li:has(>input:checked)]:opacity-60 [&_pre]:font-cascadia [&_code]:font-cascadia dark:prose-headings:text-dracula-purple dark:prose-a:text-dracula-cyan dark:prose-strong:text-dracula-yellow dark:prose-blockquote:text-dracula-comment dark:prose-blockquote:border-dracula-comment dark:prose-code:text-dracula-green"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
