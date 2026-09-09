# local-backlog (viewer)

Development source for the viewer used by the `local-backlog` Claude Code plugin. This
repo is never installed by anyone — only its compiled `dist/` output ships inside the
plugin. See `docs/STORY_LOCAL_BACKLOG_VIEWER.md` for the full design and rationale.

## Running locally

The app reads stories live via `fetch()` against a real directory listing — Vite's own
dev server doesn't generate one, so local development needs a second process standing
in for the `python3 -m http.server` the published plugin uses in production:

```bash
# Terminal 1 — serves public/backlog/ with a real, auto-generated directory listing
pnpm dev:server

# Terminal 2 — the app itself; proxies /backlog/* to the server above (see vite.config.ts)
pnpm dev
```

Both need to be running. `public/backlog/` holds mock stories (`MOCK-000X-*.md`) used
for development — edit, add, or delete them and refresh the browser to see the live-read
mechanism in action; no build or regeneration step required.

## Stack

React + TypeScript + Vite + Tailwind CSS v4, managed with pnpm. See
`.workflow-dev/context/REPO.md` for the full stack rationale and conventions.
