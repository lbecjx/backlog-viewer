import { useEffect, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
  // Shown inline above the buttons when the previous confirm attempt failed —
  // the dialog stays open on failure (see StoryActionMenu) so this has
  // somewhere to render, instead of the failure only reaching a console log.
  error?: string | null
  // True while a confirm is in flight — disables the button so a second,
  // impatient click can't fire the same action twice concurrently.
  confirmDisabled?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  children,
  error,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  return (
    <>
      <div
        onClick={onCancel}
        aria-hidden="true"
        // `starting:opacity-0` gives the mount fade-in via `@starting-style`
        // (the transition animates from that starting value), instead of a
        // keyframe animation — which would win over the `opacity-0` close
        // class for its whole runtime, so closing within the fade window would
        // skip the fade-out. A transition composes cleanly in both directions.
        className={`starting:opacity-0 fixed inset-0 z-40 bg-black/35 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`starting:opacity-0 fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 id="dialog-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              {title}
            </h2>
          </div>

          <div className="px-6 py-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">{message}</p>
            {children}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                confirmDisabled
                  ? 'bg-indigo-300 dark:bg-indigo-900 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
