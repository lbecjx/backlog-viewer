import type { ReactNode } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { formatFriendlyDate } from '../lib/formatDateTime'
import { getStatusColorClasses } from '../lib/statusColor'
import { getTypeColorClasses, getTypeIcon } from '../lib/typeColor'
import { LabelBadge } from './LabelBadge'
import { StoryBody } from './StoryBody'

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

