# MOCK-0004 · Story con tabla de metadata incompleta (a propósito)

| Field | Value |
|---|---|
| **Code** | MOCK-0004 |
| **Status** | Bloqueado por vendor |

---

## Descripción

Esta story existe a propósito con una tabla de metadata incompleta — le faltan
**Tipo**, **Prioridad**, **Labels**, **Creada** y **Actualizada**, y además el valor de
**Estado** ("Bloqueado por vendor") no es ninguno de los 3 estados esperados
(`Not Started` / `In Progress` / `Done`).

Sirve para probar que el parser no rompe ante una tabla malformada — debe caer a
defaults razonables (ej. Tipo: "Story", Prioridad: "Medium", Labels: vacío, Estado:
tratado como una categoría desconocida en vez de crashear o mostrar `undefined`) en vez
de fallar el render de toda la story.

## Acceptance Criteria

1. El visor no crashea al parsear esta story
2. Los campos faltantes se muestran con un valor por default, nunca `undefined`/`NaN`/
   una card vacía sin texto

---

> Story de prueba (mock) para desarrollo del visor — caso adversarial a propósito.
