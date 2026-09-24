import { useEffect, useState, type ReactNode } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { formatFriendlyDate, formatFriendlyDateTimes } from '../lib/formatDateTime'
import { renderMarkdownToSafeHtml } from '../lib/renderMarkdown'
import { getStatusColorClasses } from '../lib/statusColor'
import { getTypeColorClasses, getTypeIcon } from '../lib/typeColor'
import { LabelBadge } from './LabelBadge'

interface StoryDetailProps {
  story: BacklogStory | null
}

export function StoryDetail({ story }: StoryDetailProps) {
  if (!story) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-500">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label=""
          aria-hidden="true"
          className="opacity-60"
        >
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 17h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-center">Select a story to see its details</p>
      </div>
    )
  }

  return (
    // Two columns, same idea as a GitHub/Jira issue page: primary content
    // (identity, status, description, history) stays narrow and readable on
    // the left; secondary fields (type, priority, labels, dates) go in a
    // clearly separated sidebar on the right — not stacked under the title,
    // where they'd either compete with it for attention or, spread across
    // this panel's full width, end up feeling disconnected from it (both
    // tried here first; neither held up against real issue-tracker UIs).
    <div className="h-full overflow-hidden grid grid-cols-[1fr_220px]">
      <article className="p-6 overflow-y-auto h-full">
        <header className="mb-6">
          <p className="font-mono text-xs text-neutral-500 dark:text-neutral-500">{story.code}</p>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{story.title}</h1>
          <span
            className={`mt-2 inline-block text-xs px-2 py-1 rounded font-medium ${getStatusColorClasses(story.status)}`}
          >
            {story.status}
          </span>
        </header>
        {/* Keyed by code so switching stories mounts a fresh StoryBody — its `html`
            state naturally starts back at null, no manual reset inside an effect. */}
        <StoryBody key={story.code} body={story.body} />
      </article>

      <aside className="border-l border-neutral-200 dark:border-neutral-800 p-4 overflow-y-auto h-full space-y-4">
        <MetadataField label="Type">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getTypeColorClasses(story.type)}`}>
            {getTypeIcon(story.type) ? `${getTypeIcon(story.type)} ${story.type}` : story.type}
          </span>
        </MetadataField>

        <MetadataField label="Priority">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">{story.priority}</span>
        </MetadataField>

        {story.progress && (
          <MetadataField label="Progress">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {story.progress.done}/{story.progress.total} ACs
            </span>
          </MetadataField>
        )}

        {story.labels.length > 0 && (
          <MetadataField label="Labels">
            <div className="flex flex-wrap gap-1">
              {story.labels.map((label) => (
                <LabelBadge key={label} label={label} />
              ))}
            </div>
          </MetadataField>
        )}

        {story.created && (
          <MetadataField label="Created">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {formatFriendlyDate(story.created)}
            </span>
          </MetadataField>
        )}

        {story.updated && (
          <MetadataField label="Updated">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {formatFriendlyDate(story.updated)}
            </span>
          </MetadataField>
        )}
      </aside>
    </div>
  )
}

// A field's caption sits above its value, small and muted — the label reads
// first, then the value, matching how GitHub/Jira lay out an issue's own
// metadata sidebar rather than an inline "Label: value" run of text.
function MetadataField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1">
        {label}
      </p>
      {children}
    </div>
  )
}

function StoryBody({ body }: { body: string }) {
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
