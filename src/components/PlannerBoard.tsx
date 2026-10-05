import { useMemo, useRef, useState, type DragEvent } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { getConfiguredStatuses } from '../lib/statusColor'
import type { Zone } from '../lib/parseStory'
import { ConfirmDialog } from './ConfirmDialog'
import { StoryCard } from './StoryCard'

interface PlannerBoardProps {
  stories: BacklogStory[]
  selectedCode: string | null
  onSelect: (code: string) => void
  // Persists a status change (see useBacklogStories' updateStoryStatus) —
  // already optimistic-with-rollback on its own side; this component only
  // needs to call it and surface a failure, not manage the revert itself.
  onStatusChange: (code: string, status: string, note?: string) => Promise<void>
  onMoveToZone?: (code: string, zone: Zone, resolution?: string, reason?: string) => Promise<void>
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

export function PlannerBoard({ stories, selectedCode, onSelect, onStatusChange, onMoveToZone }: PlannerBoardProps) {
  const [draggedCode, setDraggedCode] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  // Set the moment a drop lands, cleared once the note dialog is confirmed or
  // cancelled. Nothing has been written to the server yet at this point — no
  // optimistic update has happened — so cancelling is free, unlike the
  // archive/move dialogs in StoryActionMenu, which gate a different write.
  const [pendingDrop, setPendingDrop] = useState<{ code: string; targetStatus: string } | null>(null)
  const [note, setNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  // Bumped on every new drop and on cancel, same pattern as StoryActionMenu's
  // own sessionTokenRef. Found by adversarial review: without it, a confirm
  // whose request is still in flight when the human cancels that dialog and
  // opens a SECOND one (a different story, or the same one again) would, once
  // the stale request settles, blindly clear whatever dialog/note is open
  // *now* — closing the second dialog and discarding its unsent note.
  const dropTokenRef = useRef(0)

  function handleDragStart(event: DragEvent<HTMLDivElement>, code: string) {
    // Required for Firefox to permit the drag gesture at all — some data
    // has to be set on the DataTransfer during dragstart, even though
    // nothing here reads it back (the drop handler uses `draggedCode`,
    // component-local React state, since source and target never leave
    // this same page).
    event.dataTransfer.setData('text/plain', code)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedCode(code)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetStatus: string) {
    event.preventDefault()
    setDropTargetStatus(null)
    const code = draggedCode
    setDraggedCode(null)
    if (!code) return

    const story = stories.find((s) => s.code === code)
    if (!story || story.status === targetStatus) return // no-op: dropped back on its own column

    dropTokenRef.current += 1
    setPendingDrop({ code, targetStatus })
  }

  function handleConfirmNote() {
    if (!pendingDrop || submittingNote) return
    const { code, targetStatus } = pendingDrop
    const token = dropTokenRef.current
    setSubmittingNote(true)
    // Collapse internal newlines and trim surrounding whitespace: the note
    // ends up on a single Markdown table row (`| **Note** | ... |`) and a
    // single History line segment (` · Note: ... `), both of which a raw
    // newline would break. Found by adversarial review.
    const sanitizedNote = note.trim().replace(/\r?\n+/g, ' ') || undefined
    onStatusChange(code, targetStatus, sanitizedNote)
      .then(() => {
        if (dropTokenRef.current !== token) return // superseded — a newer drop is open now
        setPendingDrop(null)
        setNote('')
      })
      .catch((err: unknown) => {
        if (dropTokenRef.current !== token) return
        setPendingDrop(null)
        setNote('')
        setDragError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (dropTokenRef.current === token) setSubmittingNote(false)
      })
  }

  function handleCancelNote() {
    dropTokenRef.current += 1
    setPendingDrop(null)
    setNote('')
    // Reset unconditionally, not just when nothing is in flight: cancelling
    // while a confirm's request is still pending must not leave this stuck
    // true forever — the stale request's own `.finally` above is guarded by
    // the token check and will no-op once it settles. Found by adversarial
    // review (the token guard alone fixed the race but left this stuck).
    setSubmittingNote(false)
  }

  // Memoized: recomputing every column's `stories.filter` on each render — and
  // a drag fires a render per pointer event — was the hot path this avoids.
  // `getConfiguredStatuses()` returns the palette set once at load (see
  // useBacklogStories), before any story ever renders, so it's stable across
  // the memo's `stories`-keyed lifetime without appearing in the dep array.
  const columns: Column[] = useMemo(() => {
    // Deduplicated: a repeated name in the config would otherwise produce two
    // columns computing the identical filter and colliding on React key.
    const configuredStatuses = [...new Set(getConfiguredStatuses())]
    const otherStories = stories.filter((s) => !configuredStatuses.includes(s.status))

    const cols: Column[] = configuredStatuses.map((status) => ({
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
      const insertAt = Math.max(cols.length - 1, 0)
      cols.splice(insertAt, 0, { status: null, label: 'Other', stories: otherStories })
    }

    return cols
  }, [stories])

  return (
    <div className="flex flex-col h-full">
      {dragError && (
        <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <span>Couldn't update status: {dragError}</span>
          <button
            type="button"
            onClick={() => setDragError(null)}
            aria-label="Dismiss error"
            className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0 gap-2.5 overflow-x-auto p-3">
        {columns.map(({ status, label, stories: columnStories }) => {
          const isOther = status === null
          const isDropTarget = !isOther && dropTargetStatus === status
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
              // The "Other" column is never a drop target: it has no real
              // status to assign a dropped story, being a synthetic bucket
              // for stories whose status isn't in the config at all.
              onDragOver={
                isOther
                  ? undefined
                  : (event) => {
                      event.preventDefault()
                      setDropTargetStatus(status)
                    }
              }
              onDragLeave={
                isOther
                  ? undefined
                  : () => setDropTargetStatus((current) => (current === status ? null : current))
              }
              // The `status === null` here duplicates `isOther` at runtime,
              // but isn't dead: TS narrowing doesn't propagate through an
              // intermediate boolean, so the direct null-check is what lets
              // `status` narrow to `string` for `handleDrop`'s call below.
              // Removing it as "redundant" would fail to compile.
              onDrop={isOther || status === null ? undefined : (event: DragEvent<HTMLDivElement>) => handleDrop(event, status)}
              className={`flex flex-col w-[272px] shrink-0 h-full rounded-lg transition-colors ${
                isOther
                  ? 'border border-dashed border-neutral-300 dark:border-neutral-700'
                  : isDropTarget
                    ? 'border-2 border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
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
                    // Draggable regardless of which column it's in, including
                    // "Other" — dragging an uncategorized story into a real
                    // column is exactly how a human assigns it one. Only the
                    // "Other" column itself refuses to be a *drop target*
                    // (see the column div's onDragOver/onDrop above), which
                    // is a separate, one-directional restriction.
                    draggable
                    isDragging={draggedCode === story.code}
                    onDragStart={(event) => handleDragStart(event, story.code)}
                    onDragEnd={() => setDraggedCode(null)}
                    onMoveToZone={onMoveToZone}
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

      {pendingDrop && (
        <ConfirmDialog
          open
          title={`Move to ${pendingDrop.targetStatus}?`}
          message="You can leave a short note explaining the change, or leave it blank."
          confirmLabel="Move"
          cancelLabel="Cancel"
          onConfirm={handleConfirmNote}
          onCancel={handleCancelNote}
          confirmDisabled={submittingNote}
        >
          <div>
            <label htmlFor="status-note-textarea" className="text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
              Note (optional)
            </label>
            <textarea
              id="status-note-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this moving?"
              className="mt-1 w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-500"
              rows={3}
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
