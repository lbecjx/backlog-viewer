# MOCK-0002 · Migrar autenticación a OAuth2

| Field | Value |
|---|---|
| **Code** | MOCK-0002 |
| **Type** | Story |
| **Priority** | High |
| **Status** | In Progress |
| **Labels** | auth, backend, security |
| **Created** | 2026-08-10 |
| **Updated** | 2026-08-20 |

---

## Descripción

El login actual usa sesiones basadas en cookies planas sin expiración. Migrar a OAuth2
con refresh tokens para soportar login social y expiración real de sesión.

## User Story

**Como** usuario de la plataforma
**Quiero** poder loguearme con Google/GitHub
**Para** no tener que crear y recordar otra contraseña más

## Acceptance Criteria

1. ✅ Endpoint `/auth/callback` implementado y probado
2. 🔧 Refresh token rotation implementado (en progreso — falta manejar el caso de
   refresh token robado/reusado, ver discusión en el PR #482)
3. ⬜ Login social con Google
4. ⬜ Login social con GitHub
5. ⬜ Migración de usuarios existentes (sesión vieja → nueva, sin forzar re-login)

## Definition of Done

- [ ] Acceptance Criteria cumplidos
- [ ] Tests de seguridad (intento de reuso de refresh token revocado)
- [ ] Documentación de la migración para el equipo de soporte
- [ ] Commiteado siguiendo Conventional Commits

---

> Story de prueba (mock) para desarrollo del visor.
