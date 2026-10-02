// `project.json` is written by the `local-backlog` plugin's `open-backlog.sh`
// into the staged directory (next to story-model.json), naming the project
// whose backlog this server instance is serving — so a human with several of
// these viewers open at once (one per project, each on its own port) can
// tell tabs apart by the header instead of the URL's port number. A plugin
// version that predates this file, a network error, or a malformed response
// all resolve to `null` — the header degrades to showing nothing extra
// rather than an error or a broken fetch in the console.
export async function fetchProjectName(): Promise<string | null> {
  try {
    const res = await fetch('/project.json', { cache: 'no-store' })
    if (!res.ok) return null
    const parsed: unknown = await res.json()
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      typeof (parsed as { name: unknown }).name === 'string'
    ) {
      return (parsed as { name: string }).name
    }
    return null
  } catch {
    return null
  }
}
