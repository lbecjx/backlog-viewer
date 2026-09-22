import { useState } from 'react'
import { Logo } from './components/Logo'
import { StoryDetail } from './components/StoryDetail'
import { StoryList } from './components/StoryList'
import { useBacklogStories } from './hooks/useBacklogStories'

export default function App() {
  const { stories, loading, error } = useBacklogStories()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  if (loading) {
    return (
      <p className="p-8 text-center text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500 min-h-screen">
        Loading backlog...
      </p>
    )
  }

  if (error) {
    return (
      <p className="p-8 text-center text-red-600 dark:bg-neutral-900 dark:text-red-400 min-h-screen">
        Error reading the backlog: {error}
      </p>
    )
  }

  const selected = stories.find((s) => s.code === selectedCode) ?? null

  return (
    <div className="grid grid-cols-[360px_1fr] h-screen bg-white dark:bg-neutral-900">
      <aside className="border-r border-neutral-200 dark:border-neutral-800 pt-4 px-4 overflow-hidden flex flex-col h-full">
        <Logo />
        <div className="flex-1 min-h-0">
          <StoryList stories={stories} selectedCode={selectedCode} onSelect={setSelectedCode} />
        </div>
        <p className="mt-2 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400 dark:text-neutral-600 text-center">
          © 2026 ·{' '}
          <a
            href="https://github.com/lbecjx/backlog-viewer/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            GPL-3.0
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/lbecjx/backlog-viewer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            v{__APP_VERSION__}
          </a>{' '}
          by{' '}
          <a
            href="https://github.com/lbecjx"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            @lbecjx
          </a>
        </p>
      </aside>
      <main className="overflow-hidden">
        <StoryDetail story={selected} />
      </main>
    </div>
  )
}
