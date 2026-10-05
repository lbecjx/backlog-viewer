import type { DragEvent, KeyboardEvent } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import type { Zone } from '../lib/parseStory'
import { getStatusAccentBorderClass, getStatusColorClasses } from '../lib/statusColor'
import { getTypeColorClasses, getTypeIcon } from '../lib/typeColor'
import { LabelBadge } from './LabelBadge'
import { StoryActionMenu } from './StoryActionMenu'

interface StoryCardProps {
  story: BacklogStory
  selected: boolean
  onSelect: () => void
  // Optional: only the Planner board's cards are draggable — the Backlog
  // list's cards aren't, so these stay unset (and the div plain,
  // non-draggable) for that caller.
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  // Optional: zone transition handler for the action menu. When present,
  // the menu is shown; when absent, no menu appears (e.g., in lists that
  // don't support actions).
  onMoveToZone?: (code: string, zone: Zone, resolution?: string, reason?: string) => Promise<void>
}

export function StoryCard({
  story,
  selected,
  onSelect,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onMoveToZone,
}: StoryCardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  // Wrapper: adapt moveStoryToZone signature (which takes code as first arg)
  // to StoryActionMenu's signature (which doesn't, because it already knows the story)
  const adaptedMoveToZone = onMoveToZone ? (zone: Zone, resolution?: string, reason?: string) =>
    onMoveToZone(story.code, zone, resolution, reason) : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full text-left p-3 rounded-r-lg border-y border-r border-l-4 transition-colors ${
        draggable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
      } ${isDragging ? 'opacity-50' : ''} ${getStatusAccentBorderClass(
        story.status,
      )} ${
        selected
          ? 'border-y-neutral-900 border-r-neutral-900 bg-neutral-50 dark:border-y-neutral-400 dark:border-r-neutral-400 dark:bg-neutral-700'
          : 'border-y-neutral-200 border-r-neutral-200 bg-white hover:border-y-neutral-300 hover:border-r-neutral-300 dark:border-y-neutral-700 dark:border-r-neutral-700 dark:bg-neutral-800 dark:hover:border-y-neutral-500 dark:hover:border-r-neutral-500'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{story.code}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getStatusColorClasses(story.status)}`}>
            {story.status}
          </span>
          {adaptedMoveToZone && (
            <div onClick={(e) => e.stopPropagation()}>
              <StoryActionMenu story={story} onMoveToZone={adaptedMoveToZone} />
            </div>
          )}
        </div>
      </div>
      <p
        className={`mt-1 font-medium text-sm text-neutral-900 dark:text-neutral-100 ${
          // A card is struck through if and only if its story has a
          // resolution — the only condition. Zone, archive membership and
          // Status are not consulted: the strikethrough is a visual
          // consequence of the resolution, in sync with it.
          story.resolution ? 'line-through opacity-60' : ''
        }`}
      >
        {story.title}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span className={`px-1.5 py-0.5 rounded font-medium ${getTypeColorClasses(story.type)}`}>
          {getTypeIcon(story.type) ? `${getTypeIcon(story.type)} ${story.type}` : story.type}
        </span>
        {story.progress && (
          <span>
            {story.progress.done}/{story.progress.total} ACs
          </span>
        )}
      </div>
      {story.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {story.labels.map((label) => (
            <LabelBadge key={label} label={label} />
          ))}
        </div>
      )}
    </div>
  )
}
