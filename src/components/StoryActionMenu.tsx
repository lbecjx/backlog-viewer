import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import type { Zone } from '../lib/parseStory'
import { ConfirmDialog } from './ConfirmDialog'

// One entry per action, keyed by the dialog's `action`. A single ConfirmDialog
// is rendered from this, instead of three near-identical dialogs that were
// always mounted (three times the scrim, three duplicate `dialog-title` ids)
// and differed only in these strings.
const DIALOGS = {
  move: {
    title: 'Move to Planner?',
    message: 'The story will move to the Planner column and keep its status.',
    confirmLabel: 'Move',
  },
  archive: {
    title: 'Archive this story?',
    message: 'It will be moved to the Archive and its status will become Done.',
    confirmLabel: 'Archive',
  },
  unarchive: {
    title: 'Restore this story?',
    message: 'It will return to the Backlog and keep its status.',
    confirmLabel: 'Restore',
  },
} as const

// Matches ConfirmDialog's own `duration-200` opacity fade. The dialog is
// mounted lazily — only while an action is open, or fading closed — rather
// than once per card: on a large board, one always-mounted dialog per story
// bloats the render tree and mints a duplicate `id="dialog-title"` per card.
// `DIALOG_FADE_MS` is how long the closing dialog stays in the DOM after
// `confirmDialog` clears, so its fade-out has an element to animate before
// the timer unmounts it.
const DIALOG_FADE_MS = 200

type DialogAction = 'move' | 'archive' | 'unarchive'

interface StoryActionMenuProps {
  story: BacklogStory
  onMoveToZone: (zone: Zone, resolution?: string, reason?: string) => Promise<void>
}

export function StoryActionMenu({ story, onMoveToZone }: StoryActionMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ action: DialogAction } | null>(null)
  // `mountedDialog` stays in the DOM while an action is open and for
  // DIALOG_FADE_MS after it closes, so the fade-out has an element to animate
  // before the timer unmounts it. It's written from the open/cancel handlers
  // directly (not derived in an effect) so re-opening inside the fade window
  // just clears the pending unmount and re-syncs.
  const [mountedDialog, setMountedDialog] = useState<{ action: DialogAction } | null>(null)
  const [resolution, setResolution] = useState('Done')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // Bumped on every cancel/new-dialog-open so a confirm's continuation can
  // tell, once its await settles, whether the user has since moved on (Escape,
  // Cancel, or opening a different action) — without this, a slow abandoned
  // call resolving later would force-close whatever dialog is open *now*,
  // show its stale error on an unrelated dialog, or leave a fresh dialog's
  // confirm button disabled from a `submitting` flag that was never reset
  // (found via adversarial review).
  const sessionTokenRef = useRef(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mount/unmount is driven by the open/cancel handlers, not derived in an
  // effect: `openDialog` mounts and cancels any pending unmount; the close
  // paths call `scheduleUnmount` to unmount DIALOG_FADE_MS later. The only
  // effect here cancels a stray timer on teardown — it never triggers a render.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function scheduleUnmount() {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setMountedDialog(null)
    }, DIALOG_FADE_MS)
  }

  function openDialog(action: DialogAction) {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    sessionTokenRef.current += 1
    setConfirmDialog({ action })
    setMountedDialog({ action })
    setMenuOpen(false)
    setActionError(null)
    setSubmitting(false)
  }

  async function handleConfirm() {
    if (!confirmDialog || submitting) return
    const token = sessionTokenRef.current
    setSubmitting(true)
    try {
      if (confirmDialog.action === 'move') {
        await onMoveToZone('planner')
      } else if (confirmDialog.action === 'archive') {
        await onMoveToZone('archive', resolution, note)
      } else if (confirmDialog.action === 'unarchive') {
        await onMoveToZone('backlog')
      }
      if (sessionTokenRef.current !== token) return // superseded — user already left this dialog
      setConfirmDialog(null)
      scheduleUnmount()
      setResolution('Done')
      setNote('')
      setActionError(null)
    } catch (err) {
      if (sessionTokenRef.current !== token) return
      // Dialog stays open so the human sees exactly what failed and can
      // retry or cancel — closing it here would silently leave the story in
      // whatever partial state the failed call left it in.
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      if (sessionTokenRef.current === token) setSubmitting(false)
    }
  }

  function handleCancel() {
    sessionTokenRef.current += 1
    setConfirmDialog(null)
    scheduleUnmount()
    setResolution('Done')
    setNote('')
    setActionError(null)
    setSubmitting(false)
  }

  // Determine which actions to show based on zone
  const canMove = story.zone === 'backlog'
  const canArchive = story.zone === 'backlog' || story.zone === 'planner'
  const canUnarchive = story.zone === 'archive'

  const hasActions = canMove || canArchive || canUnarchive

  const archiveChildren: ReactNode =
    story.status === 'Done' ? null : (
      <div className="space-y-3">
        <div>
          <label htmlFor="resolution-select" className="text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
            Resolution
          </label>
          <select
            id="resolution-select"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
          >
            <option value="Done">Done</option>
            <option value="Won't Do">Won't Do</option>
          </select>
        </div>
        <div>
          <label htmlFor="note-textarea" className="text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
            Note (optional)
          </label>
          <textarea
            id="note-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you archiving this?"
            className="mt-1 w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-500"
            rows={3}
          />
        </div>
      </div>
    )

  if (!hasActions) return null

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Story actions"
          className="cursor-pointer p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white dark:bg-neutral-900 shadow-lg border border-neutral-200 dark:border-neutral-800 z-50 py-1">
            {canMove && (
              <button
                type="button"
                onClick={() => openDialog('move')}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Move to Planner
              </button>
            )}
            {canArchive && (
              <button
                type="button"
                onClick={() => openDialog('archive')}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Archive
              </button>
            )}
            {canUnarchive && (
              <button
                type="button"
                onClick={() => openDialog('unarchive')}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Unarchive
              </button>
            )}
          </div>
        )}
      </div>

      {mountedDialog !== null && (
        <ConfirmDialog
          open={confirmDialog !== null}
          title={DIALOGS[mountedDialog.action].title}
          message={DIALOGS[mountedDialog.action].message}
          confirmLabel={DIALOGS[mountedDialog.action].confirmLabel}
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          error={actionError}
          confirmDisabled={submitting}
        >
          {mountedDialog.action === 'archive' ? archiveChildren : null}
        </ConfirmDialog>
      )}
    </>
  )
}
