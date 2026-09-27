# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/), versioning follows
[Semantic Versioning](https://semver.org/).

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
