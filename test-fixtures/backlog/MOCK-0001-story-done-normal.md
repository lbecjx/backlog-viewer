# MOCK-0001 · Agregar botón de exportar a CSV

| Field | Value |
|---|---|
| **Code** | MOCK-0001 |
| **Type** | Story |
| **Priority** | Medium |
| **Status** | Done |
| **Labels** | export, ui |
| **Created** | 2026-08-01 |
| **Updated** | 2026-08-05 |

---

## Descripción

La tabla de resultados no tiene forma de exportar los datos filtrados. Agregar un botón
que descargue el estado actual de la tabla (con filtros aplicados) como CSV.

## User Story

**Como** usuario que analiza datos filtrados
**Quiero** exportar la vista actual a CSV
**Para** poder abrirla en Excel/Sheets sin tener que copiar celda por celda

## Acceptance Criteria

1. ✅ Botón "Exportar CSV" visible cuando hay al menos 1 fila en la tabla
2. ✅ El CSV respeta los filtros/orden actuales, no el dataset completo sin filtrar
3. ✅ Nombre de archivo incluye la fecha (`export-2026-08-05.csv`)

## Definition of Done

- [x] Acceptance Criteria cumplidos
- [x] Tests agregados
- [x] Commiteado siguiendo Conventional Commits

---

> Story de prueba (mock) para desarrollo del visor.
