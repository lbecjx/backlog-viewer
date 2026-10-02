# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/), versioning follows
[Semantic Versioning](https://semver.org/).

## 0.5.0

- The header now shows the current project's name, centered, so multiple
  open viewers (one per project, each on its own port) can be told apart at
  a glance. Requires a `local-backlog` plugin version that writes
  `project.json`; an older version simply shows nothing extra.

## 0.4.0

- Any status change made in the Planner (dragging a card between columns) can
  now carry an optional note explaining why, via a small confirmation dialog —
  left blank, the change proceeds with no note, same as before.
- A story's current `Resolution` and `Note` are now shown in the detail
  panel's sidebar, alongside `Status`, whenever present.
- The archive dialog's "Reason (optional)" field is now labeled
  "Note (optional)", matching the single note concept used everywhere else.

## 0.3.0

- The viewer now fetches the backlog from `/local-backlog/` instead of the
  hardcoded `/backlog/` path, matching the `local-backlog` plugin's own
  consumer-facing folder name. The dev/test mock fixtures directory
  (`test-fixtures/backlog/`) is renamed to `test-fixtures/local-backlog/` to
  match. No functional or visual change — this is an internal HTTP path
  contract update between the plugin and its vendored viewer build.

## 0.2.0

- The board's `archive` list is read as bare code strings, matching `planner`.
  Entries are no longer dropped, so archived stories stay out of the Backlog
  list.
- A card's title is struck through if and only if its story has a `Resolution`,
  instead of whenever it sat in the archive zone. The rule is presence-based,
  so a new resolution value is honoured with no code change, and the
  strikethrough applies on every surface that renders a card.

## 0.1.2

- Story loading no longer fails entirely when a single story fetch drops a
  connection: the fetch is retried, and a story that still can't be loaded is
  skipped so the rest of the backlog renders instead of a full error.

## 0.1.1

- `parseStory` no longer falls back to legacy Spanish metadata keys
  (`Código`/`Tipo`/`Prioridad`/`Estado`/`Creada`/`Actualizada`) — only the
  current English keys (`Code`/`Type`/`Priority`/`Status`/`Created`/`Updated`)
  are recognized. Mock fixtures updated to match.

## 0.1.0

- Initial React viewer for local backlog stories: story list, search, status
  filtering, and Markdown rendering of a selected story.
