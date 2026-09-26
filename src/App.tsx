import { useState } from 'react'
import { Logo } from './components/Logo'
import { PlannerBoard } from './components/PlannerBoard'
import { StoryDetail } from './components/StoryDetail'
import { StoryDetailDrawer } from './components/StoryDetailDrawer'
import { StoryList } from './components/StoryList'
import { TabBar } from './components/TabBar'
import { useBacklogStories } from './hooks/useBacklogStories'
import type { Zone } from './lib/computeZone'
import { tabId, tabPanelId } from './lib/tabIds'

export default function App() {
  const { stories, loading, error, updateStoryStatus } = useBacklogStories()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Zone>('backlog')

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

  // Filtered by whichever tab is active, not hardcoded to Backlog — Planner
  // and Archive get their own real views in later task groups, but this
  // same filter-then-reuse-for-selection shape already fits them: a story
  // can't be "selected" if it's not in the list that could have selected it.
  const visibleStories = stories.filter((s) => s.zone === activeTab)
  const selected = visibleStories.find((s) => s.code === selectedCode) ?? null
  // Backlog opens with its first story already shown, rather than the empty
  // "select a story" placeholder — only a display fallback (selectedCode
  // itself stays null until a real click happens), and only for Backlog:
  // Planner's "selection" opens a drawer, which must never appear on its
  // own without the human clicking a card.
  const displayed = selected ?? (activeTab === 'backlog' ? (visibleStories[0] ?? null) : null)
  const displayedCode = displayed?.code ?? null

  // Planner needs its full width for columns, unlike the single-column
  // Backlog/Archive lists — so it drops the fixed 360px sidebar in favor of
  // a full-width region, and the detail view becomes a floating drawer
  // (StoryDetailDrawer) instead of a permanent side panel. The region is a
  // `<main>` landmark in that case (it IS the primary content), not an
  // `<aside>` (secondary, next to a main panel) — same content, correct
  // semantics for each layout.
  const isPlanner = activeTab === 'planner'
  const Region: 'main' | 'aside' = isPlanner ? 'main' : 'aside'

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-neutral-900">
      {/* Logo and navigation share one header row spanning the full page
          width — previously Logo sat above TabBar, both stacked inside
          whichever narrow/full-width region the active tab used, which
          meant Planner's full-width board had no visible nav bar above it. */}
      <header className="flex items-center gap-6 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <Logo />
        <TabBar active={activeTab} onChange={setActiveTab} />
      </header>
      <div className={`flex-1 min-h-0 grid ${isPlanner ? 'grid-cols-1' : 'grid-cols-[360px_1fr]'}`}>
        <Region
          className={`overflow-hidden flex flex-col h-full ${
            isPlanner ? '' : 'border-r border-neutral-200 dark:border-neutral-800 pt-4 px-4'
          }`}
        >
          <div
            className="flex-1 min-h-0"
            role="tabpanel"
            id={tabPanelId(activeTab)}
            aria-labelledby={tabId(activeTab)}
          >
            {activeTab === 'backlog' && (
              <StoryList stories={visibleStories} selectedCode={displayedCode} onSelect={setSelectedCode} />
            )}
            {activeTab === 'planner' && (
              <PlannerBoard
                stories={visibleStories}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                onStatusChange={updateStoryStatus}
              />
            )}
            {/* Archive reuses StoryList as-is, exactly like Backlog — it's
                already a generic search/filter/list over whatever `stories`
                it's given, and `visibleStories` above is already
                zone-filtered per tab. StoryCard's own title strikethrough is
                keyed off `zone === 'archive'` (not `status === 'Done'`), so
                an archived item still reads as visually "closed" here even
                if a future project's data ever has an archived story whose
                Status isn't literally "Done" — the human chose reusing the
                list wholesale over a separate, near-duplicate component. */}
            {activeTab === 'archive' && (
              <StoryList stories={visibleStories} selectedCode={displayedCode} onSelect={setSelectedCode} />
            )}
          </div>
          <p
            className={`py-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400 dark:text-neutral-600 text-center ${
              isPlanner ? 'mt-2 mx-4' : 'mt-2'
            }`}
          >
            © {new Date().getFullYear()} ·{' '}
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
        </Region>
        {!isPlanner && (
          <main className="overflow-hidden">
            <StoryDetail story={displayed} />
          </main>
        )}
      </div>
      {/* Always mounted, unlike the `<main>` above — the drawer's own open/close
          state drives a slide transition (see StoryDetailDrawer), which needs
          the element to still be in the DOM one frame after `story` clears. */}
      <StoryDetailDrawer story={isPlanner ? selected : null} onClose={() => setSelectedCode(null)} />
    </div>
  )
}
