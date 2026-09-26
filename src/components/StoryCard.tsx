import type { DragEvent } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { getStatusAccentBorderClass, getStatusColorClasses } from '../lib/statusColor'
import { getTypeColorClasses, getTypeIcon } from '../lib/typeColor'
import { LabelBadge } from './LabelBadge'

interface StoryCardProps {
  story: BacklogStory
  selected: boolean
  onSelect: () => void
  // Optional: only the Planner board's cards are draggable — the Backlog
  // list's cards aren't, so these stay unset (and the button plain,
  // non-draggable) for that caller.
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd?: () => void
}

export function StoryCard({
  story,
  selected,
  onSelect,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: StoryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getStatusColorClasses(story.status)}`}>
          {story.status}
        </span>
      </div>
      <p
        className={`mt-1 font-medium text-sm text-neutral-900 dark:text-neutral-100 ${
          // Keyed off being archived, not off the status text — every
          // archived story's Status happens to be "Done" today (an
          // established server-side invariant), but the visual "this is
          // closed and put away" signal should track the zone directly,
          // not incidentally match a string.
          story.zone === 'archive' ? 'line-through opacity-60' : ''
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
    </button>
  )
}
