# MOCK-0008 · Buscador no encuentra coincidencias dentro del cuerpo de la story

| Field | Value |
|---|---|
| **Code** | MOCK-0008 |
| **Type** | Bug |
| **Priority** | High |
| **Status** | Not Started |
| **Labels** | search, bug, regression, viewer, high-priority, ux |
| **Created** | 2026-08-29 |
| **Updated** | 2026-08-29 |

---

## Descripción

El buscador del sidebar solo matchea contra código y título — no busca dentro del
cuerpo (Descripción, ACs, Notas técnicas), aunque el copy dice "Buscar por código,
título o contenido...".

## User Story

**Como** usuario con muchas stories en el backlog
**Quiero** que la búsqueda encuentre coincidencias dentro del texto de la story
**Para** no tener que abrir cada una manualmente para confirmar si menciona algo

## Acceptance Criteria

1. ⬜ La búsqueda matchea substrings dentro del body (case-insensitive)
2. ⬜ El highlight visual indica por qué matcheó (título vs. contenido)
3. ⬜ No hay regresión de performance perceptible con 50+ stories

## Definition of Done

- [ ] Acceptance Criteria cumplidos
- [ ] Tests agregados para el nuevo comportamiento de búsqueda

---

> Story de prueba (mock) — caso con muchos labels (6), para probar overflow/wrap visual.
