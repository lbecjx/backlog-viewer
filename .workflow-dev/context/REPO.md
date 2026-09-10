# REPO.md — Backlog Viewer (viewer source for the local-backlog plugin)
> Contexto de trabajo persistente
> Creado: 2026-09-08 | Última actualización: 2026-09-10

---

## 1. What this is

**System context.** Este repo es el **código fuente de desarrollo** de la app que reemplaza
el visor estático del plugin de Claude Code `local-backlog`. No es un producto para
usuarios finales — su único consumidor real es el `dist/` que produce, que se copia a
mano al repo separado `claude-plugins/local-backlog` (que sí es lo que la gente instala).
Nadie que use el plugin ve React, corre `pnpm`, ni siquiera sabe que este repo existe.

**Identidad del proyecto (2026-09-10):** se renombró de "local-backlog (viewer)" a
**Backlog Viewer** — mismo motivo que llevó al plugin a llamarse `local-backlog`: evitar
que el nombre de este repo choque/confunda con el del plugin que consume su build. Nombre
de paquete (`package.json`): `backlog-viewer`. Repo público en GitHub:
[`lbecjx/backlog-viewer`](https://github.com/lbecjx/backlog-viewer), licencia
GPL-3.0-or-later, `main` protegida (PR obligatorio, `enforce_admins`, sin force-push/borrado
— mismo esquema que `workflow-dev` y `local-backlog`). Versionado semver propio,
independiente del de los plugins — regla explícita: nunca sincronizar números de versión
entre este repo y el plugin que lo embebe, aunque uno consuma el build del otro.

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
4. Paridad funcional completa con el generador Python que reemplazó
   (`build_backlog_index.py`, ya eliminado del repo del plugin) — cumplida.

**Code tone.** TypeScript estricto (`noUnusedLocals`, `noUnusedParameters`,
`erasableSyntaxOnly` activos), componentes pequeños, named exports (verificado en código
real — ver Sección 4). Sin backend, sin base de datos, sin autenticación — es una SPA de
una sola pantalla (lista + detalle) que lee archivos del sistema vía `fetch()` contra un
`http.server` local.

---

## 2. Stack

| Tecnología | Versión | Notas |
|---|---|---|
| React | ^19.2.8 | Sin React Compiler activado |
| react-dom | ^19.2.8 | |
| TypeScript | ~6.0.2 | |
| Vite | ^8.2.2 | Motor Rolldown + Oxc |
| @vitejs/plugin-react | ^6.1.0 | |
| Tailwind CSS | ^4.3.3 | **Conectado** (`@import "tailwindcss"` en `src/index.css`, plugin `tailwindcss()` en `vite.config.ts`) — CSS-first vía `@theme`, sin `tailwind.config.js` |
| @tailwindcss/typography | (dev) | Plugin `prose`/`prose-invert` para el Markdown renderizado |
| Vitest + jsdom | (dev) | Runner de tests, 36 tests en 8 archivos |
| @testing-library/react, /jest-dom, /user-event | (dev) | Tests de componentes |
| marked | ^18 | Parser de Markdown |
| dompurify | | Sanitización antes de insertar en el DOM |
| shiki | | Resaltado de sintaxis (tema `dracula`), API fine-grained + engine JS puro |
| oxlint | ^1.79.0 | Único linter — `.oxlintrc.json` ya tiene plugins `react`/`typescript`/`oxc` |
| Gestor de paquetes | **pnpm** | Estándar personal para todo proyecto JS/TS nuevo — nunca npm |

---

## 3. Project Structure

```
backlog-viewer/
  docs/
    STORY_LOCAL_BACKLOG_VIEWER.md   ← la épica completa: por qué, arquitectura, decisiones
  public/
    backlog/           ← 8 stories mock para desarrollo (MOCK-0001..0008)
    favicon.svg
    icons.svg
  src/
    components/
      Logo.tsx          ← wordmark "Backlog Viewer" (sin versión/link — eso vive en el footer)
      StoryList.tsx (+test)
      StoryCard.tsx
      StoryDetail.tsx   ← detalle + empty-state (ícono + texto centrados)
      StatusChip.tsx
      LabelBadge.tsx
    hooks/
      useBacklogStories.ts
    lib/
      discoverStories.ts (+test)   ← descubrimiento en vivo
      parseStory.ts (+test)        ← metadata + body (claves en inglés únicamente)
      renderMarkdown.ts (+test)    ← marked + DOMPurify + Shiki
      highlighter.ts               ← instancia compartida de Shiki
      computeAcProgress.ts (+test)
      labelColor.ts / statusColor.ts / typeColor.ts (+tests)
    App.tsx        ← layout (sidebar + main), footer con © / licencia / versión / autor
    index.css      ← Tailwind v4 + tokens (`--font-cascadia`, `--color-dracula-*`)
    main.tsx
  index.html       ← lleva su propia nota de copyright (única excepción — ver Sección 6)
  LICENSE          ← GPL-3.0, texto completo
  CHANGELOG.md
  vite.config.ts   ← plugin Tailwind + proxy `/backlog` → http.server local (dev)
  vitest.config.ts / vitest.global-setup.ts / vitest.setup.ts
  .oxlintrc.json
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
```

---

## 4. Conventions

- **Imports:** `verbatimModuleSyntax: true` en `tsconfig.app.json` — usar siempre
  `import type { X }` / `export type { X }` explícito para type-only imports.
- **TypeScript:** `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`,
  `noFallthroughCasesInSwitch` activos — con `erasableSyntaxOnly`, evitar `enum` y
  `namespace`.
- **Named exports en vez de `export default`** — verificado en código real: todos los
  componentes/módulos propios (`Logo`, `StoryDetail`, `parseStory`, etc.) usan named
  export. Única excepción: `App.tsx` mantiene `export default function App()` porque
  así lo espera `main.tsx` del scaffold de Vite — no es una inconsistencia, es la
  convención estándar de Vite para el componente raíz.
- **Gestor de paquetes:** pnpm siempre, nunca npm.
- **Mensajes de commit:** Conventional Commits (`feat:`, `fix:`, `chore:`) — verificado
  en el historial real de este repo.
- **Colores fuera de la paleta neutra de Tailwind van como tokens `@theme`, nunca como
  hex arbitrario en un `className`** (`text-[#bd93f9]`) — ver Descubrimientos en la
  story para el porqué (incidente real, no solo preferencia).

---

## 5. Good Practices

### React 19.2
- React Compiler es estable (1.0) pero no está activado — mantener memoización manual
  (`useMemo`/`useCallback`) donde el costo de recomputar sea real (ej. parseo de
  Markdown, que no es gratis).
- Fijar `^19.2.7` o superior — CVE-2025-55182 afectó el rango `19.0.0`–`19.2.2`. Ya se
  cumple (`^19.2.8`).

### Vite ^8.2.2
- Vite 8 usa Rolldown en vez de Rollup/esbuild — si se necesita algún plugin de
  terceros, confirmar compatibilidad con Rolldown antes de asumir que funciona igual
  que en Vite 5/6.
- `__APP_VERSION__` se inyecta vía `define` en `vite.config.ts`, leyendo `pkg.version`
  de `package.json` en build time — nunca hardcodear el número de versión en el código.

### Tailwind CSS v4
- CSS-first vía `@theme` en `src/index.css` — no `tailwind.config.js`.
- **No hex/color hardcodeado en `className` una vez que existe un token para eso** —
  incidente real de esta sesión: se agregaron colores Dracula (`dark:prose-headings:
  text-[#bd93f9]`, etc.) como arbitrary values, y hubo que revertir a tokens
  (`--color-dracula-purple` en `@theme` → clase generada `text-dracula-purple`)
  cuando se pidió explícitamente. Mismo error ya documentado en otro proyecto personal
  (`notebooks`): un sistema de diseño que existe pero no se hace cumplir con ninguna
  herramienta, con el tiempo se ignora.
- Verificar hex de una paleta de terceros (ej. Dracula) contra el archivo fuente real
  de la dependencia ya instalada (`node_modules/.../themes/dracula.mjs`), nunca de
  memoria — se hizo así esta sesión antes de confirmar los 5 valores usados.

### Vitest
- El server de test (`vitest.global-setup.ts`) levanta un `python3 -m http.server` real
  en un puerto dedicado (8002) contra `public/backlog/` — los tests hablan con el
  mecanismo real de descubrimiento, nunca con `fetch` mockeado.
- Ningún test hardcodea un conteo de mocks sin necesidad real — pero cuando SÍ lo hace
  (`discoverStories.test.ts`, conteo exacto "encuentra estos N archivos"), agregar una
  mock nueva rompe ese test a propósito — es una señal, no un bug; actualizar el
  conteo/lista esperada junto con la mock nueva.

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

### Copyright / licencia
- **No agregar la nota de copyright por archivo a cada `.ts`/`.tsx`** — se evaluó y se
  descartó (2026-09-10): la guía de GNU que pide esto está pensada para proyectos tipo
  GCC/Bash (archivos de cientos/miles de líneas en C), no para componentes React de
  10-30 líneas donde el aviso pesaría más que el código. La única excepción explícita
  es `index.html` (por pedido directo). El resto de la atribución legal vive en
  `LICENSE`, `README.md` (sección License) y el campo `license` de `package.json` —
  eso alcanza.

---

## 7. Infrastructure / Local Dev

- **Comandos:** `pnpm dev` (servidor de desarrollo), `pnpm dev:server` (server real de
  `public/backlog/` para desarrollo, puerto 8001), `pnpm build` (`tsc -b && vite build`
  → genera `dist/`), `pnpm test` (Vitest), `pnpm lint` (oxlint), `pnpm preview`.
- **Sin CI configurado** — no hay `.github/workflows`. `main` sí tiene protección de
  rama en GitHub (PR obligatorio) desde 2026-09-10, pero eso es política del repo, no
  un pipeline que corra tests automáticamente.
- **`dist/` está en `.gitignore`** — correcto para este repo: es un artefacto de build,
  no se versiona acá. Se copia a mano al repo del plugin (`rsync -av --delete
  --exclude='backlog' dist/ <plugin>/skills/open-backlog/dist/`) cuando corresponde.
- **Autenticación GitHub CLI:** `gh` autenticado como `lbecjx` (SSH). Cualquier acción
  de escritura de `gh` (crear PR, mergear, cambiar settings del repo) necesita
  autorización explícita del humano antes de correrse — regla general, no específica
  de este repo (ver memoria global `feedback_gh_cli_authorization`).

---

## 8. Key Files

| Archivo | Ruta | Sirve para |
|---|---|---|
| La épica completa | `docs/STORY_LOCAL_BACKLOG_VIEWER.md` | Por qué existe este proyecto, arquitectura, decisiones ya tomadas |
| Config de Vite | `vite.config.ts` | Plugin Tailwind + proxy de desarrollo + inyección de `__APP_VERSION__` |
| Entry point UI | `src/App.tsx` | Layout (sidebar + main) y el footer con licencia/versión/autor |
| Tokens de diseño | `src/index.css` | `@theme` — fuente de Cascadia Code y de la paleta Dracula del prose |
| Parser de stories | `src/lib/parseStory.ts` | Único parser de metadata — claves en inglés solamente |

---

## 9. Integrations

Ninguna — SPA sin backend, sin auth, sin APIs externas. Su única "integración" es leer
archivos servidos por una instancia local de `python3 -m http.server`, que corre en el
proyecto que consume el plugin (no en este repo).
