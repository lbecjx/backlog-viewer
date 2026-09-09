# MOCK-0005 · Cachear respuestas de la API de precios

| Campo | Valor |
|---|---|
| **Código** | MOCK-0005 |
| **Tipo** | Bug |
| **Prioridad** | Low |
| **Estado** | Not Started |
| **Labels** | performance, api, cache, backend |
| **Creada** | 2026-08-22 |
| **Actualizada** | 2026-08-22 |

---

## Descripción

El endpoint `/api/pricing` se llama sin caché en cada carga de página, aunque los
precios solo cambian una vez por día. Agregar una capa de caché simple.

## Acceptance Criteria

1. Respuesta cacheada por 24hs con invalidación manual disponible
2. Cache-hit no debe hacer ningún round-trip de red

## Notas técnicas

Ejemplo de la firma actual del endpoint:

```ts
async function getPricing(sku: string): Promise<PricingResponse> {
  const res = await fetch(`/api/pricing/${sku}`)
  return res.json()
}
```

Propuesta con caché:

```ts
const cache = new Map<string, { data: PricingResponse; expiresAt: number }>()

async function getPricing(sku: string): Promise<PricingResponse> {
  const hit = cache.get(sku)
  if (hit && hit.expiresAt > Date.now()) return hit.data

  const res = await fetch(`/api/pricing/${sku}`)
  const data = await res.json()
  cache.set(sku, { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
  return data
}
```

## Definition of Done

- [ ] Acceptance Criteria cumplidos
- [ ] Tests del caché (hit, miss, expiración)

---

> Story de prueba (mock) para desarrollo del visor — cubre bloques de código y múltiples labels.
