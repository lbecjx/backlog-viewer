# MOCK-0006 · Limpiar warnings de TypeScript en modo strict

| Field | Value |
|---|---|
| **Code** | MOCK-0006 |
| **Type** | Task |
| **Priority** | Low |
| **Status** | Done |
| **Created** | 2026-08-25 |
| **Updated** | 2026-08-26 |

---

## Descripción

Activar `strict: true` en `tsconfig.json` generó ~40 warnings nuevos, principalmente
`noImplicitAny` en callbacks de terceros. Resolverlos uno por uno sin suprimir con `any`.

## Acceptance Criteria

1. ✅ `tsc --noEmit` corre sin warnings
2. ✅ Ningún `any` explícito agregado como atajo
3. ✅ CI actualizado para fallar el build si reaparecen warnings

## Definition of Done

- [x] Acceptance Criteria cumplidos
- [x] Commiteado siguiendo Conventional Commits

---

> Story de prueba (mock) — caso sin Labels (campo opcional, la tabla puede omitirlo por completo).
