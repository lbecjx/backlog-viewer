export function Logo() {
  return (
    <div className="mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 shrink-0 shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" role="img" aria-label="Backlog Viewer">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="white" strokeWidth="1.8" />
            <path d="M7 9h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 13h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 17h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="17" cy="9" r="1.5" fill="white" />
          </svg>
        </span>
        <p className="font-mono font-bold text-base leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
          Backlog Viewer
        </p>
      </div>
    </div>
  )
}
