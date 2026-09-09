# REPO.md — local-backlog (viewer source)
> Contexto de trabajo persistente
> Creado: 2026-09-08 | Última actualización: 2026-09-08

---

## 1. What this is

**System context.** Este repo es el **código fuente de desarrollo** de la app que reemplaza
el visor estático del plugin de Claude Code `local-backlog`. No es un producto para
usuarios finales — su único consumidor real es el `dist/` que produce, que se copia a
mano al repo separado `claude-plugins/local-backlog` (que sí es lo que la gente instala).
Nadie que use el plugin ve React, corre `pnpm`, ni siquiera sabe que este repo existe.

**Qué significa "falla" acá.** No hay usuarios reales de esta app en ejecución — el
único momento en que "falla" importa es cuando el `dist/` compilado se sirve desde
`python3 -m http.server` dentro de un proyecto ajeno y (a) no lee las stories reales del
disco en vivo, (b) rompe al renderizar un Markdown malformado, o (c) inserta HTML sin
sanitizar en el DOM. Ver `docs/STORY_LOCAL_BACKLOG_VIEWER.md` para el diseño completo y
las decisiones ya tomadas.

**Prioridades de desarrollo, en orden:**
1. Lectura en vivo correcta — el listado de stories siempre refleja el disco real, sin
   ningún paso de generación (ver Sección 3 de la story).
2. Cero dependencias nuevas para quien instala el plugin final — este repo puede usar
   todo el tooling de React/Vite/pnpm que quiera, porque nada de eso llega al usuario del
   plugin (solo el `dist/` compilado, servido con Python).
3. Seguridad al renderizar Markdown ajeno — sanitizar antes de insertar en el DOM, aunque
   el contenido sea "de confianza" en teoría (ver Sección 6 de la story).
4. Paridad funcional completa con el generador Python que reemplaza (`build_backlog_index.py`,
   en el repo del plugin) antes de considerar esto listo.

**Code tone.** TypeScript estricto (`noUnusedLocals`, `noUnusedParameters`,
`erasableSyntaxOnly` activos), componentes pequeños. Sin backend, sin base de datos, sin
autenticación — es una SPA de una sola pantalla (lista + detalle) que lee archivos del
sistema vía `fetch()` contra un `http.server` local.

---

## 2. Stack

| Tecnología | Versión | Notas |
|---|---|---|
| React | ^19.2.8 | Sin React Compiler activado |
| react-dom | ^19.2.8 | |
| TypeScript | ~6.0.2 | |
| Vite | ^8.2.2 | Motor Rolldown + Oxc |
| @vitejs/plugin-react | ^6.1.0 | |
| Tailwind CSS | ^4.3.3 | ⚠️ Instalado (`tailwindcss` + `@tailwindcss/vite`) pero **no conectado todavía** — `vite.config.ts` solo tiene el plugin `react()`, y `src/index.css` sigue siendo el CSS plano por defecto del scaffold de Vite, sin `@import "tailwindcss"`. Cablear esto es trabajo pendiente, no un hecho ya completo. |
| oxlint | ^1.79.0 | Único linter — `.oxlintrc.json` ya tiene plugins `react`/`typescript`/`oxc` |
| Gestor de paquetes | **pnpm** | Estándar personal para todo proyecto JS/TS nuevo — nunca npm |

---

## 3. Project Structure

```
local-backlog/
  docs/
    STORY_LOCAL_BACKLOG_VIEWER.md   ← la épica completa: por qué, arquitectura, decisiones pendientes
  public/
    favicon.svg
    icons.svg
  src/
    App.tsx        ← scaffold por defecto de Vite, sin tocar todavía
    App.css
    index.css      ← CSS plano por defecto, Tailwind NO conectado
    main.tsx
  index.html
  vite.config.ts   ← solo react(), falta el plugin de Tailwind
  .oxlintrc.json
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
```

Todavía no existe una carpeta `src/components/` — el scaffold está en su estado inicial,
sin ningún componente propio del visor escrito aún.

---

## 4. Conventions

- **Imports:** `verbatimModuleSyntax: true` en `tsconfig.app.json` — usar siempre
  `import type { X }` / `export type { X }` explícito para type-only imports.
- **TypeScript:** `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`,
  `noFallthroughCasesInSwitch` activos — con `erasableSyntaxOnly`, evitar `enum` y
  `namespace`.
- **Convención heredada de otros proyectos personales (a confirmar en este repo, no
  verificada en código real todavía):** named exports en vez de `export default`, y
  estructura Atomic Design (atoms → molecules → organisms) si la complejidad de UI lo
  justifica. El scaffold de Vite trae `export default function App()` por defecto — no
  se tocó todavía, no asumir que ya sigue esta convención hasta cambiarlo.
- **Gestor de paquetes:** pnpm siempre, nunca npm.
- **Mensajes de commit:** sin definir todavía en este repo — no hay commits aún.

---

## 5. Good Practices

### React 19.2
- React Compiler es estable (1.0) pero no está activado — mantener memoización manual
  (`useMemo`/`useCallback`) donde el costo de recomputar sea real (ej. parseo de
  Markdown, que no es gratis).
- Preferir `use()` para leer promesas condicionalmente en vez de `useEffect` + estado
  local, si el flujo de fetch de stories lo permite.
- Fijar `^19.2.7` o superior — CVE-2025-55182 afectó el rango `19.0.0`–`19.2.2`. Ya se
  cumple (`^19.2.8`).

### Vite ^8.2.2
- Vite 8 usa Rolldown en vez de Rollup/esbuild — si se necesita algún plugin de
  terceros, confirmar compatibilidad con Rolldown antes de asumir que funciona igual
  que en Vite 5/6.
- El plugin de Tailwind (`@tailwindcss/vite`) va en el array `plugins` de
  `vite.config.ts`, junto a `react()` — pendiente de agregar (ver Sección 2).

### Tailwind CSS v4 (cuando se conecte)
- CSS-first vía `@theme` en el CSS de entrada — no `tailwind.config.js`.
- No hex/spacing hardcodeado una vez que los tokens existan — mismo error ya
  documentado como incidente real en otro proyecto personal (`notebooks`): un sistema de
  diseño que existe pero no se hace cumplir con ninguna herramienta, con el tiempo se
  ignora.

---

## 6. Prohibitions

### Seguridad — renderizar Markdown ajeno (la razón de ser de este proyecto)
- **No usar `dangerouslySetInnerHTML` sobre la salida de un parser de Markdown sin
  sanitizar antes.** Ver Sección 6 de `docs/STORY_LOCAL_BACKLOG_VIEWER.md` — mismo
  patrón que `CodeBlock` de `notebooks` (DOMPurify antes de insertar, documentar el
  contrato de origen del contenido en el código).
- **No listar/leer archivos fuera de la carpeta de stories esperada.** El listado en
  vivo (Sección 3 de la story) confía en el `href` que devuelve `http.server` — filtrar
  siempre por el patrón `^[A-Z]{2,6}-\d{4}-.*\.md$` antes de hacer `fetch()` de cualquier
  archivo, nunca asumir que todo lo listado es una story válida.

### React 19.2.x
- No usar un ref callback con return implícito no vacío (`ref={(el) => (x.current = el)}`)
  — React 19 lo interpreta como función de cleanup. Usar siempre body de bloque.

### Vite ^8.2.2
- No asumir que un plugin de la era Rollup/esbuild sigue funcionando igual bajo
  Rolldown sin verificarlo.
- No poner secretos en variables `VITE_*` — se exponen completas en el bundle cliente
  (no debería aplicar acá, no hay secretos que manejar, pero vale como regla general).

---

## 7. Infrastructure / Local Dev

- **Comandos:** `pnpm dev` (servidor de desarrollo), `pnpm build` (`tsc -b && vite build`
  → genera `dist/`), `pnpm lint` (oxlint), `pnpm preview`.
- **Sin CI configurado** — no hay `.github/workflows`.
- **Sin tests configurados todavía** — no hay Vitest ni ningún runner instalado.
- **`dist/` está en `.gitignore`** (default del scaffold de Vite) — correcto para este
  repo: es un artefacto de build, no se versiona acá. Se copia a mano al repo del plugin
  cuando corresponda (ver Sección 8 de la story, decisión pendiente sobre cómo
  automatizar ese paso).

---

## 8. Key Files

| Archivo | Ruta | Sirve para |
|---|---|---|
| La épica completa | `docs/STORY_LOCAL_BACKLOG_VIEWER.md` | Por qué existe este proyecto, arquitectura, decisiones ya tomadas y pendientes |
| Config de Vite | `vite.config.ts` | Falta agregar el plugin de Tailwind |
| Entry point | `src/main.tsx` + `src/App.tsx` | Todavía el scaffold por defecto, sin componentes propios |

---

## 9. Integrations

Ninguna — SPA sin backend, sin auth, sin APIs externas. Su única "integración" es leer
archivos servidos por una instancia local de `python3 -m http.server`, que corre en el
proyecto que consume el plugin (no en este repo).
