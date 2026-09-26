import { useMemo, useState } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StatusChip } from './StatusChip'
import { StoryCard } from './StoryCard'

interface StoryListProps {
  stories: BacklogStory[]
  selectedCode: string | null
  onSelect: (code: string) => void
}

function matchesSearch(story: BacklogStory, query: string): boolean {
  if (!query) return true
  const haystack = `${story.code} ${story.title} ${story.body}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export function StoryList({ stories, selectedCode, onSelect }: StoryListProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const statuses = useMemo(() => Array.from(new Set(stories.map((s) => s.status))).sort(), [stories])

  const filtered = useMemo(
    () => stories.filter((s) => matchesSearch(s, query)).filter((s) => !statusFilter || s.status === statusFilter),
    [stories, query, statusFilter],
  )

  function toggleStatus(status: string) {
    setStatusFilter((current) => (current === status ? null : status))
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <input
        type="search"
        placeholder="Search by code, title, or content..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-3 py-2 rounded-lg border border-neutral-300 text-sm bg-white text-neutral-900 placeholder:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      {/* Filtering makes sense only when there's something to distinguish —
          a single status among every visible story means every chip click
          would just show all-or-nothing, so the row doesn't even render. */}
      {statuses.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((status) => (
            <StatusChip
              key={status}
              status={status}
              active={statusFilter === status}
              onClick={() => toggleStatus(status)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto">
        {filtered.map((story) => (
          <StoryCard
            key={story.code}
            story={story}
            selected={story.code === selectedCode}
            onSelect={() => onSelect(story.code)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-8">No results</p>
        )}
      </div>
    </div>
  )
}
