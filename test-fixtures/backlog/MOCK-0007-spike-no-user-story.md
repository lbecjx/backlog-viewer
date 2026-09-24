# MOCK-0007 · Investigar alternativas a Tailwind v4 para theming dinámico

| Field | Value |
|---|---|
| **Code** | MOCK-0007 |
| **Type** | Spike |
| **Priority** | Medium |
| **Status** | In Progress |
| **Labels** | research, css |
| **Created** | 2026-08-27 |
| **Updated** | 2026-08-28 |

---

## Descripción

El theming actual (claro/oscuro) usa `dark:` de Tailwind, pero un futuro modo "alto
contraste" necesitaría un tercer tema simultáneo. Investigar si conviene CSS custom
properties + `data-theme` en vez de más variantes `dark:` repetidas por componente.

## Acceptance Criteria

1. 🔧 Comparación escrita de al menos 2 enfoques (CSS vars vs. clases Tailwind extra)
2. ⬜ Recomendación con trade-offs, no una implementación completa

## Notas técnicas

- Este spike no requiere User Story — es investigación, no una capacidad de usuario final
- Ver precedente: `docs/STORY_LOCAL_BACKLOG_VIEWER.md` sección de theming

## Definition of Done

- [ ] Acceptance Criteria cumplidos
- [ ] Hallazgos documentados en REPO.md si aplican a futuras stories

---

> Story de prueba (mock) — caso sin sección "User Story" (opcional para Spike/Task).
