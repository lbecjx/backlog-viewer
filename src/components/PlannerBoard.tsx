import type { BacklogStory } from '../hooks/useBacklogStories'
import { getConfiguredStatuses } from '../lib/statusColor'
import { StoryCard } from './StoryCard'

interface PlannerBoardProps {
  stories: BacklogStory[]
  selectedCode: string | null
  onSelect: (code: string) => void
}

interface Column {
  // `null` identifies the synthetic catch-all bucket structurally, never by
  // string — a real `.backlog-statuses.json` entry can legally be named
  // "Other", and status names can legally repeat (a hand-edit typo, a merge
  // artifact); neither case is distinguishable from the catch-all, or from
  // each other, by comparing display strings (found via adversarial review).
  status: string | null
  label: string
  stories: BacklogStory[]
}

export function PlannerBoard({ stories, selectedCode, onSelect }: PlannerBoardProps) {
  // Deduplicated: a repeated name in the config would otherwise produce two
  // columns computing the identical filter and colliding on React key.
  const configuredStatuses = [...new Set(getConfiguredStatuses())]
  const otherStories = stories.filter((s) => !configuredStatuses.includes(s.status))

  const columns: Column[] = configuredStatuses.map((status) => ({
    status,
    label: status,
    stories: stories.filter((s) => s.status === status),
  }))
  // The catch-all column only appears when it would hold something — a
  // status outside `.backlog-statuses.json` (leftover data, a typo) must
  // still be visible somewhere, but an always-present empty column would be
  // noise for the common case where every story's status is already
  // configured. Inserted right before the last configured column (not
  // appended after it): a project's config conventionally lists its
  // terminal/completed status last (e.g. "Done"), and unfiled stories read
  // better sitting just ahead of that than trailing behind it.
  if (otherStories.length > 0) {
    const insertAt = Math.max(columns.length - 1, 0)
    columns.splice(insertAt, 0, { status: null, label: 'Other', stories: otherStories })
  }

  return (
    <div className="flex gap-2.5 h-full overflow-x-auto p-3">
      {columns.map(({ status, label, stories: columnStories }) => {
        const isOther = status === null
        return (
          // Namespaced, not just distinct from "Other": every real column's
          // key starts with `status:`, which the catch-all's key ('catchall')
          // never does — collision-free by construction, not by picking a
          // sentinel string a real status merely happens not to collide with
          // today (the previous `status ?? '__other__'` was exactly that: it
          // fixed the literal "Other" collision by moving the same risk to a
          // status literally named "__other__").
          <div
            key={status !== null ? `status:${status}` : 'catchall'}
            className={`flex flex-col w-[272px] shrink-0 h-full rounded-lg ${
              isOther
                ? 'border border-dashed border-neutral-300 dark:border-neutral-700'
                : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  isOther ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {isOther && <span aria-hidden="true">◌</span>}
                {label}
              </span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                {columnStories.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto p-2">
              {columnStories.map((story) => (
                <StoryCard
                  key={story.code}
                  story={story}
                  selected={story.code === selectedCode}
                  onSelect={() => onSelect(story.code)}
                />
              ))}
              {columnStories.length === 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">No stories</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
