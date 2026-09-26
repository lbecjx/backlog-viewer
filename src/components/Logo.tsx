// No longer owns its own bottom border/margin — it now sits inline next to
// TabBar inside App.tsx's top-level header row, which owns that border and
// vertical padding for the whole row instead of just the width Logo used to
// occupy alone.
export function Logo() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 shrink-0 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" role="img" aria-label="Backlog Viewer">
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="white" strokeWidth="1.8" />
          <path d="M7 9h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 13h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 17h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="17" cy="9" r="1.5" fill="white" />
        </svg>
      </span>
      <p className="font-mono font-semibold text-sm leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
        Backlog Viewer
      </p>
    </div>
  )
}
