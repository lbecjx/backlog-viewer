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
        Cargando backlog...
      </p>
    )
  }

  if (error) {
    return (
      <p className="p-8 text-center text-red-600 dark:bg-neutral-900 dark:text-red-400 min-h-screen">
        Error al leer el backlog: {error}
      </p>
    )
  }

  const selected = stories.find((s) => s.code === selectedCode) ?? null

  return (
    <div className="grid grid-cols-[360px_1fr] h-screen bg-white dark:bg-neutral-900">
      <aside className="border-r border-neutral-200 dark:border-neutral-800 p-4 overflow-hidden flex flex-col h-full">
        <Logo />
        <div className="flex-1 min-h-0">
          <StoryList stories={stories} selectedCode={selectedCode} onSelect={setSelectedCode} />
        </div>
      </aside>
      <main className="overflow-hidden">
        <StoryDetail story={selected} />
      </main>
    </div>
  )
}
