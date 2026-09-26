import { useEffect, useState, type ReactNode } from 'react'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { formatFriendlyDate } from '../lib/formatDateTime'
import { getStatusColorClasses } from '../lib/statusColor'
import { getTypeColorClasses, getTypeIcon } from '../lib/typeColor'
import { LabelBadge } from './LabelBadge'
import { StoryBody } from './StoryBody'

interface StoryDetailDrawerProps {
  story: BacklogStory | null
  onClose: () => void
}

// Always mounted (see App.tsx) so the closing transition can play. `open`
// drives the panel/scrim transform; content renders from `shown`, not
// `story` directly — `shown` only ever advances to a new non-null story, it
// never resets to null, so the last real story stays rendered (off-screen,
// behind `translate-x-full`) while closing instead of the content vanishing
// on the same render the close animation starts (found via adversarial
// review: gating content on `story` too meant `open` and the content check
// were the same expression, so there was never a frame where the panel was
// animating out WITH its content still visible).
export function StoryDetailDrawer({ story, onClose }: StoryDetailDrawerProps) {
  const open = story !== null
  const [shown, setShown] = useState(story)
  // Adjusting state during render (not in a useEffect) per React's own
  // guidance for "keep the last non-null prop value in state" — this runs
  // synchronously in the same render/commit, so there's no extra render (or
  // lint warning about setState-in-effect) between the prop clearing and
  // `shown` catching up.
  if (story !== null && story !== shown) {
    setShown(story)
  }

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[540px] flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {shown && (
          <>
            <div className="px-5 pt-4 pb-3.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-neutral-500">{shown.code}</span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close story detail"
                  className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-base font-bold leading-snug mb-2.5 text-neutral-900 dark:text-neutral-50">
                {shown.title}
              </h2>
              <span
                className={`inline-block text-xs px-2 py-1 rounded font-medium ${getStatusColorClasses(shown.status)}`}
              >
                {shown.status}
              </span>
            </div>

            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-x-6 gap-y-3 shrink-0">
              <DrawerMetaField label="Type">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getTypeColorClasses(shown.type)}`}>
                  {getTypeIcon(shown.type) ? `${getTypeIcon(shown.type)} ${shown.type}` : shown.type}
                </span>
              </DrawerMetaField>

              <DrawerMetaField label="Priority">
                <span className="text-xs text-neutral-700 dark:text-neutral-300">{shown.priority}</span>
              </DrawerMetaField>

              {shown.progress && (
                <DrawerMetaField label="Progress">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    {shown.progress.done}/{shown.progress.total} ACs
                  </span>
                </DrawerMetaField>
              )}

              {shown.created && (
                <DrawerMetaField label="Created">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    {formatFriendlyDate(shown.created)}
                  </span>
                </DrawerMetaField>
              )}

              {shown.updated && (
                <DrawerMetaField label="Updated">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    {formatFriendlyDate(shown.updated)}
                  </span>
                </DrawerMetaField>
              )}

              {shown.labels.length > 0 && (
                <DrawerMetaField label="Labels" full>
                  <div className="flex flex-wrap gap-1">
                    {shown.labels.map((label) => (
                      <LabelBadge key={label} label={label} />
                    ))}
                  </div>
                </DrawerMetaField>
              )}
            </div>

            {shown.progress && shown.progress.total > 0 && (
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Acceptance Criteria
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                    {shown.progress.done}/{shown.progress.total}
                  </span>
                </div>
                <div className="h-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800">
                  {/* Percentage is computed at render time from story data — Tailwind's
                      build-time class scanner can't pre-generate an arbitrary `w-[N%]`
                      for every possible N, so the width itself is the one property that
                      has to be an inline style here. */}
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
                    style={{ width: `${(shown.progress.done / shown.progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <StoryBody key={shown.code} body={shown.body} />
            </div>
          </>
        )}
      </div>
    </>
  )
}

function DrawerMetaField({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'w-full' : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1">
        {label}
      </p>
      {children}
    </div>
  )
}
