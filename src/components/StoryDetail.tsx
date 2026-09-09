import { useEffect, useState } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { renderMarkdownToSafeHtml } from '../lib/renderMarkdown'

interface StoryDetailProps {
  story: BacklogStory | null
}

export function StoryDetail({ story }: StoryDetailProps) {
  if (!story) {
    return (
      <p className="text-neutral-400 dark:text-neutral-500 text-sm p-8 text-center">
        Seleccioná una story para ver el detalle
      </p>
    )
  }

  return (
    <article className="p-6 overflow-y-auto h-full">
      <header className="mb-4">
        <p className="font-mono text-xs text-neutral-500 dark:text-neutral-500">{story.code}</p>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{story.title}</h1>
      </header>
      {/* Keyed by code so switching stories mounts a fresh StoryBody — its `html`
          state naturally starts back at null, no manual reset inside an effect. */}
      <StoryBody key={story.code} body={story.body} />
    </article>
  )
}

function StoryBody({ body }: { body: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    renderMarkdownToSafeHtml(body).then((rendered) => {
      if (!cancelled) setHtml(rendered)
    })
    return () => {
      cancelled = true
    }
  }, [body])

  if (html === null) {
    return <p className="text-neutral-400 dark:text-neutral-500 text-sm">Renderizando…</p>
  }

  return (
    // html comes from renderMarkdownToSafeHtml — sanitized with DOMPurify before
    // reaching this point; see the contract documented in lib/renderMarkdown.ts.
    // Checked task-list items (`- [x] ...`) get struck through — an established
    // convention for completed checklist items (Trello, Obsidian, GFM task lists).
    // Scoped to `li:has(checked checkbox)`, not the whole document.
    <div
      className="prose prose-sm dark:prose-invert max-w-none [&_li:has(>input:checked)]:line-through [&_li:has(>input:checked)]:opacity-60 [&_pre]:font-cascadia [&_code]:font-cascadia"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
