# STORY_LOCAL_BACKLOG_VIEWER: reescribir el visor de local-backlog como app React con lectura en vivo
> Contexto persistente — creado: 2026-09-08 | última actualización: 2026-09-10
> Repo context: [REPO.md](./REPO.md)

---

## 1. Contexto Base

### 1.1 Story
**ID:** `docs/STORY_LOCAL_BACKLOG_VIEWER.md`
**Status:** Done (2026-09-09) — para el alcance de este repo. AC #4/#5 quedan como
trabajo pendiente en `claude-plugins/local-backlog`, no de esta app.
**Assignee:** N/A (sin Jira)
**Sprint:** N/A (sin Jira)

**Descripción:**
El plugin de Claude Code `local-backlog` (repo separado en `claude-plugins/local-backlog`)
da a proyectos sin Jira un sustituto local: tickets Markdown con código auto-incremental
y un visor tipo Jira. Hoy ese visor es un script Python que embebe todas las stories
como JSON en un `index.html` estático — cada edición exige regenerar y refrescar a mano.
Esta épica lo reemplaza por una app React que lee las stories **en vivo** desde disco en
cada carga de página, sin ningún paso de generación.

**Decisión de arquitectura central (ya tomada, no re-discutir sin razón nueva):**
Build una sola vez en desarrollo (este repo) → `dist/` se copia al repo del plugin →
el plugin sirve ese `dist/` con `python3 -m http.server` en runtime. React/Vite/pnpm
quedan del lado del autor; quien instala el plugin solo necesita Python (dependencia que
el plugin ya tenía). Se descartó explícitamente la alternativa de que el usuario final
corra `pnpm dev` — rompería la promesa de "cero dependencias" del plugin.

**Mecanismo de lectura en vivo (ya decidido):** explota que
`python3 -m http.server`/`SimpleHTTPRequestHandler` genera automáticamente un listado
HTML (`<a href>` por archivo) cuando se pide una carpeta sin `index.html` propio. La app
hace `fetch()` de esa carpeta, parsea el HTML devuelto, filtra los `href` con el patrón
`^[A-Z]{2,6}-\d{4}-.*\.md$`, y hace `fetch()` individual de cada `.md` que sobrevive el
filtro. Sin manifest, sin paso de generación — el listado siempre refleja el disco real.

**Acceptance Criteria** (extraídas de la sección "Definición de terminado" del doc fuente,
que en este proyecto cumple el mismo rol que un checklist de ACs):
1. La app lee stories en vivo desde `backlog/` sin ningún paso de generación
2. Paridad funcional completa con `build_backlog_index.py`:
   a. Panel izquierdo: lista de cards buscable (código, título, tipo, estado, progreso de ACs)
   b. Buscador: matchea código, título, y texto completo del cuerpo
   c. Chips de estado: click para filtrar, click de nuevo para limpiar
   d. Panel derecho: la story seleccionada, renderizada desde su Markdown
   e. Metadata leída de la tabla de cada story (Código/Tipo/Prioridad/Estado/Labels),
      con fallback a defaults razonables si la tabla está malformada
   f. Listas multi-línea en el Markdown no se rompen ni renumeran (bug ya resuelto una
      vez en la versión Python — no reintroducirlo)
   g. Filtrado de archivos por `^[A-Z]{2,6}-\d{4}-` — agnóstico al prefijo del proyecto
3. Markdown sanitizado antes de insertarse en el DOM (parser establecido + DOMPurify,
   mismo patrón que `CodeBlock` de `notebooks`; documentar el contrato de origen del
   contenido en el código)
4. El skill `open-local-backlog` detecta y reporta con claridad, sin fallar en silencio:
   a. `python3` ausente (chequeo `command -v python3` antes de intentar levantar nada)
   b. Falla al levantar el server — mitigado usando puerto `0` (el SO asigna uno libre)
      en vez de un puerto fijo; si aun así falla, mostrar el error real
5. `pnpm build` genera un `dist/` funcional servido con `python3 -m http.server` desde
   la ubicación que se decida (ver Descubrimientos — Decisión Pendiente #1)
6. Verificación visual real: crear, editar, y borrar una story a mano con el visor
   abierto, confirmar que F5 siempre refleja el estado actual sin correr nada más

**Blockers / Linked issues:** Ninguno.

**Notes from ticket:**
- Fuera de alcance explícito: editar una story desde el visor (sigue de solo lectura),
  cualquier backend/DB/auth real, y que el usuario final del plugin necesite correr
  `pnpm dev` en algún momento.

### 1.2 Epic
N/A — esta ES la épica (documento fuente único, sin Jira).

### 1.3 TDD / Documentación
**Fuente:** `docs/STORY_LOCAL_BACKLOG_VIEWER.md` (el propio doc, completo — no hay TDD
separado). Contiene además la comparación de los dos proyectos involucrados (este repo
de desarrollo vs. el repo del plugin publicado) y la tabla de responsabilidades de cada
uno — ver Sección 1 del doc fuente si hace falta releerla completa.

### 1.4 Archivos relevantes (story-specific)
| Referencia | Ruta | Sirve para |
|-----------|------|------------|
| Generador a reemplazar (referencia de comportamiento, vive en OTRO repo) | `claude-plugins/local-backlog/scripts/build_backlog_index.py` | Fuente de verdad de la paridad funcional pedida en AC #2 — cada bug ya resuelto ahí (multi-línea, `</script>` en el JSON embebido, regex de prefijo) es una trampa a no reintroducir, aunque el mecanismo de lectura cambie por completo |
| Skill que lanza el server (vive en el repo del plugin) | `claude-plugins/local-backlog/skills/open-local-backlog/SKILL.md` | Necesita actualizarse para AC #4 (chequeos de `python3`/puerto) y para apuntar al nuevo `dist/` en vez de invocar el script Python viejo |
| Patrón de sanitización a replicar | `notebooks/packages/ui/src/atoms/CodeBlock.tsx` (repo externo, personal) | Ejemplo ya probado de "parsear/generar HTML ajeno + sanitizar con DOMPurify + documentar contrato de origen" — mismo patrón pedido en AC #3 |
| Scaffold actual, sin tocar | `src/App.tsx`, `src/index.css` | Punto de partida — Tailwind instalado pero no conectado (ver REPO.md sección 2) |

### 1.5 Modelo de datos
No hay modelo de datos persistente — el "modelo" es la estructura de una story:
metadata en una tabla Markdown (Código/Tipo/Prioridad/Estado/Labels/Creada/Actualizada)
seguida de secciones libres (Descripción, User Story, Acceptance Criteria, Definition of
Done). El parser debe extraer la tabla de metadata y tratar el resto como cuerpo/búsqueda
de texto completo.

---

## 2. Memoria de trabajo

### Decisiones
| Fecha | Decisión | Quién decidió |
|-------|----------|---------------|
| 2026-09-10 | Renombrar el proyecto de "local-backlog (viewer)" a **Backlog Viewer** (`package.json` → `backlog-viewer`) — mismo choque de nombres que ya se había evitado del lado del plugin: este repo y el plugin `local-backlog` no deben compartir nombre aunque uno consuma el build del otro | Luis |
| 2026-09-10 | Repo publicado en GitHub como [`lbecjx/backlog-viewer`](https://github.com/lbecjx/backlog-viewer), licencia GPL-3.0-or-later, `main` con protección de rama (PR obligatorio, `enforce_admins`, sin force-push/borrado) — mismo esquema que `workflow-dev`/`local-backlog` | Luis |
| 2026-09-10 | Copyright/atribución: nombre real ("lbecjx") en `LICENSE`/`README`/`package.json`; handle (`@lbecjx`) reservado para identidad de GitHub/UI — separación consistente con la declaración de identidad firmada hecha en paralelo en los repos de los plugins | Luis |
| 2026-09-10 | Nota de copyright por archivo: se evaluó aplicarla a todo `.ts`/`.tsx` (como en los plugins) y se **revirtió** — la guía de GNU está pensada para archivos de cientos de líneas en C, no para componentes React de 10-30 líneas. Única excepción: `index.html`, por pedido explícito | Luis |
| 2026-09-10 | Versionado de este repo (`0.1.x`) permanece completamente independiente del versionado del plugin `local-backlog` (`1.x`), incluso después del rename | Luis |
| 2026-09-10 | Colores fuera de la paleta neutra van como tokens `@theme` (`--color-dracula-*`), nunca como hex arbitrario en clases (`text-[#bd93f9]`) — revertido de arbitrary values a tokens tras pedido explícito | Luis |
| 2026-09-10 | Eliminado el fallback a claves de metadata en español (`Tipo`/`Estado`/etc.) en `parseStory.ts` — el template actual del plugin ya solo genera claves en inglés, y no hay stories reales (fuera de fixtures propias) dependiendo del formato viejo | Luis |
| 2026-09-07/08 | Build una vez + `dist/` servido con Python, en vez de que el usuario final corra `pnpm dev` — preserva "cero dependencias" del plugin publicado | Luis |
| 2026-09-07/08 | Lectura en vivo vía el listado HTML autogenerado de `http.server`, sin manifest.json — el listado siempre refleja el disco real, sin paso de generación ni para crear ni para borrar stories | Luis |
| 2026-09-07/08 | Puerto `0` (auto-asignado por el SO) en vez de uno fijo, para evitar el caso de falla más común ("address already in use") de raíz | Luis |
| 2026-09-08 | `.workflow-dev/` de este repo queda **trackeado** (no gitignoreado) — igual criterio que `notebooks` | Luis |
| 2026-09-08 | Se descartó un server Python custom que mapeara dos carpetas externas (`dist/` del plugin + `backlog/` del usuario) bajo prefijos distintos — deben quedar independientes, sin un script que los acople | Luis |
| 2026-09-08 | Se descartó también copiar el `dist/` dentro de `backlog/` en cada corrida del skill — mismo motivo (acopla dos cosas que deben ser independientes) | Luis |
| 2026-09-08 | El skill `open-local-backlog` no debe saber nada de este repo React/Vite — solo consume un `dist/` ya compilado que vive en una ruta fija dentro del propio repo del plugin (propuesta: `skills/open-local-backlog/dist/`, sin confirmar todavía) | Luis |
| 2026-09-08 | Para desarrollo: un `python3 -m http.server` real (vía `pnpm dev:server`) sirve `public/backlog/`, y Vite proxea `/backlog/*` hacia ese server — el código de fetch/descubrimiento habla con el mecanismo real todo el tiempo, nunca con un mock aparte | Luis |
| 2026-09-08 | El fix de continuación multi-línea (AC #2.f) se re-ubicó de `parseStory.ts` a TG5 (renderer) — `parseStory` solo separa metadata de body y preserva el body verbatim; una librería MD establecida ya maneja continuación de listas correctamente por diseño (CommonMark), el bug original solo existía porque el generador Python tenía un renderer casero línea por línea | Init/Implement (re-scoping durante TG4, no re-preguntado por ser una mejora obvia sin trade-off) |

### Descubrimientos
- El scaffold de Vite trae Tailwind instalado (`tailwindcss`, `@tailwindcss/vite`) pero
  NO conectado — falta el plugin en `vite.config.ts` y el `@import` en `src/index.css`.
  Es trabajo real pendiente, no algo ya resuelto por el scaffold.
- No existe `src/components/` todavía — cero componentes propios del visor escritos.
- Este repo no tenía `.git` — se inicializó recién en este `init` (2026-09-08).
- **`tsc -b` no reconocía los matchers de `@testing-library/jest-dom` en los archivos
  de test** — no basta con agregarlo a `types` en `tsconfig.app.json` (eso funciona para
  paquetes con augmentación ambient global, no para el subpath `/vitest` que se importa
  como valor). Fix real: agregar `vitest.setup.ts` (que hace el import) al `include` de
  `tsconfig.app.json`, para que su augmentación de tipos entre al grafo de compilación.
- **Un `border-{color}` (todos los lados) puede pisar un `border-l-{color}` específico
  según el orden interno del stylesheet que genera Tailwind — el orden de las clases en
  el `className` de React NO determina cuál gana.** Encontrado al verificar con
  `getComputedStyle` (no a simple vista): la barra de acento izquierda mostraba gris en
  vez del color de Estado real. Fix: eliminar el `border-{color}` shorthand por completo
  y usar lados explícitos (`border-y-*`, `border-r-*`) para las 3 caras que no llevan
  acento, dejando `border-l-*` sin ningún competidor. Lección: para casos donde un lado
  necesita un color distinto al resto, verificar con `getComputedStyle` en vez de
  confiar en la inspección visual — a simple vista los dos grises casi no se distinguían.
- **🔴 Bug real encontrado en TG7: `fetch()` sin `cache: 'no-store'` puede servir
  contenido viejo de un archivo que SÍ cambió en disco.** Verificado empíricamente
  (no asumido): tras editar el `Estado` de un mock a mano, un `fetch()` normal desde la
  consola devolvía el contenido viejo — el mismo `fetch()` con `{ cache: 'no-store' }`
  devolvía el contenido real y actualizado. Esto violaba directamente la promesa
  central de la Sección 3 de la story ("sin generación, siempre refleja el disco
  real"). Fix: `cache: 'no-store'` en ambos `fetch()` de `discoverStories.ts` (listado
  y contenido individual). Re-verificado con el ciclo completo crear+editar+borrar +
  F5 real (no llamadas manuales) hasta confirmar que funciona de punta a punta.
  Lección: el mecanismo "en vivo" de esta story depende de un detalle de la Fetch API
  que no es obvio — sin este fix, la funcionalidad se ve bien en la carga inicial pero
  falla silenciosamente en el caso de uso real (editar y refrescar).
- **`marked` NO espera (`await`) el valor de retorno de un `renderer.code` async, ni
  siquiera con `{ async: true }` — solo `walkTokens` se espera de verdad.** Verificado
  empíricamente vía un test que falló primero: un `renderer.code` `async` que devolvía
  una Promise terminó concatenado como el string literal `"[object Promise]"` en el
  HTML final, no el resultado real. Fix: usar `walkTokens` (que SÍ se espera) para
  correr Shiki y guardar el HTML resaltado directo en el token (`code.highlighted`),
  dejando que `renderer.code` lo lea de vuelta de forma síncrona. Este es el patrón
  real que soporta highlighters async con `marked`, no lo que parecía obvio a primera
  vista por el tipado (`RendererOutput` genérico sugiere que podría aceptar una
  Promise, pero el loop del parser hace concatenación de string plana, no `await`).
- **Sin `@tailwindcss/typography`, la clase `prose` no hace nada** — Tailwind v4 resetea
  agresivamente estilos por defecto de headers/listas (Preflight), así que sin el
  plugin, el Markdown renderizado se veía como texto plano sin jerarquía visual aunque
  el HTML generado fuera correcto. Encontrado en verificación visual real, no asumido.
- **`marked` NO escapa HTML crudo embebido en el Markdown fuente, a diferencia de
  Shiki.** Verificado empíricamente: `marked.parse('<script>alert(1)</script>')`
  devuelve el tag `<script>` sin tocar — CommonMark trata HTML inline/block como
  pass-through por diseño. Esto significa que en `renderMarkdown.ts`, DOMPurify es la
  defensa **primaria** (no "en profundidad" como en `CodeBlock`/Shiki de `notebooks`,
  donde el tokenizer ya escapaba `<` por su cuenta). Documentado en el comentario del
  módulo — no asumir el mismo modelo de amenaza en futuros parsers de Markdown sin
  verificar antes cómo manejan HTML crudo cada uno.
- **El dev server de Vite NO genera listado automático de directorio** — a diferencia de
  `python3 -m http.server`, pedir una carpeta sin `index.html` propio devuelve el
  `index.html` de la SPA (fallback normal), no una lista de archivos. Verificado
  empíricamente con `curl` antes de asumirlo. Por eso hace falta el proxy hacia un
  `http.server` real para poder probar el mecanismo de descubrimiento durante `pnpm dev`.
- El proxy de Vite necesita `rewrite` para pelar el prefijo `/backlog` — el
  `http.server` ya se levanta con `--directory public/backlog` como raíz, así que sin el
  rewrite, pedir `/backlog/` le hace buscar una subcarpeta `backlog/` que no existe
  (404). Verificado con `curl` tras el fix: los 5 mocks aparecen correctos en el listado.

- **`discoverStories.test.ts` hardcodea el conteo/lista exacta de mocks esperados** —
  agregar una story mock nueva a `public/backlog/` rompe ese test a propósito (no es un
  bug del código, es el test haciendo su trabajo). Al sumar 3 mocks nuevas (0006/0007/0008)
  hubo que actualizar el conteo de 5→8 y la lista completa de filenames esperados.
- **Mover el repo de carpeta (`mv`) rompe el proceso de Vite corriendo** — el dev server
  quedó con file watchers apuntando a la ruta vieja tras renombrar
  `web/local-backlog` → `web/backlog-viewer`; hubo que matar el proceso viejo y levantar
  uno nuevo desde la ruta correcta. Lección: cualquier `mv`/rename de un repo con un dev
  server activo requiere reiniciar ese proceso, no asumir que sigue sirviendo bien.
- **Verificar paletas de terceros contra el archivo fuente real de la dependencia, no de
  memoria** — antes de aplicar los 5 colores de Dracula al `prose`, se confirmaron los
  hex exactos leyendo `node_modules/.../@shikijs/themes/dist/dracula.mjs` (la misma
  dependencia que ya usa `highlighter.ts`), en vez de confiar en el conocimiento general
  del asistente sobre la paleta.
- **Tailwind Typography permite recolorear cada elemento del `prose` con modificadores
  (`prose-headings:`, `prose-a:`, `prose-strong:`, `prose-blockquote:`, `prose-code:`)**
  — aplicados solo bajo `dark:` porque los colores de Dracula están calibrados para fondo
  oscuro; en modo claro se pierde contraste, así que se dejó el gris por defecto de
  Typography en ese modo.

### No hacer
- No asumir que el `dist/` de este repo se sirve desde la raíz del proyecto consumidor —
  la ubicación exacta relativa a `backlog/` es una decisión pendiente (ver abajo), no un
  hecho ya resuelto.
- No reintroducir los bugs ya cazados una vez en la versión Python (ver AC #2.f y la fila
  de "Generador a reemplazar" en Archivos relevantes) solo porque el mecanismo de lectura
  cambió — la paridad funcional pedida es completa, no parcial.
- No hacer que el usuario final del plugin necesite Node/pnpm en ningún punto del flujo.

### Intentos fallidos
- Se evaluó (y descartó, antes de este `init`) que el usuario final corriera un dev
  server de React directamente (`pnpm dev`) para ver el visor — rompe la promesa de
  "cero dependencias" del plugin. Ver Sección 2 del doc fuente para el razonamiento
  completo.

---

## 3. Progreso

### Acceptance Criteria
| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 1 | Lectura en vivo sin generación | ✅ done | Verificado dos veces — la 1ra reveló el bug de caché (ver Descubrimientos), la 2da confirmó el fix |
| 2 | Paridad funcional con el generador Python (a-g) | ✅ done | Los 7 sub-ítems cubiertos en TG6, con tests + verificación visual |
| 3 | Markdown sanitizado (DOMPurify) | ✅ done | `marked` + DOMPurify, 2 tests de seguridad verificados discriminantes |
| 4 | Manejo de errores del skill (python3 / puerto) | ⬜ pendiente | Vive en el OTRO repo (`claude-plugins/local-backlog`), fuera del alcance de esta app React — story aparte o continuación allá |
| 5 | `dist/` funcional servido con `http.server` | ⬜ pendiente | Ídem — depende de resolver la ubicación exacta del `dist/` en el repo del plugin (ver Decisiones, ya NO acoplado a `backlog/`) |
| 6 | Verificación visual (crear/editar/borrar + F5) | ✅ done | TG7 — encontró y arregló el bug de caché en el proceso |

**Estados:** ⬜ pendiente | 🔧 en progreso | ✅ done

### Avance estimado: 100% de lo que corresponde a este repo (7/7 Task Groups). Las
ACs #4 y #5 quedan abiertas a propósito — son trabajo del repo del plugin
(`claude-plugins/local-backlog`), no de esta app React.

### Post-completitud (2026-09-10) — fuera del alcance de los Task Groups originales
Con la story ya Done (ver arriba), esta sesión hizo una pasada de "hardening/pulido" que
no estaba en el plan original de TG1-7:
- Fix real: `parseStory.ts` ya no acepta claves de metadata en español (ver Decisiones)
- Rename completo del proyecto a "Backlog Viewer" (código + docs + repo GitHub)
- Publicación real: repo `lbecjx/backlog-viewer`, LICENSE (GPL-3.0-or-later), protección
  de rama en `main`
- Footer del sidebar rediseñado: `© 2026 · GPL-3.0 (link a LICENSE) · vX.Y.Z (link al
  repo) · by @lbecjx (link al perfil)` — iterado varias veces sobre espaciado/simetría
  vertical con el humano viendo screenshots reales
- `Logo.tsx` simplificado a solo el wordmark "Backlog Viewer" (sin versión/link — eso se
  movió al footer para no duplicar información arriba y abajo)
- Colores Dracula aplicados al `prose` del detalle de story (headings/links/bold/
  blockquote/código inline), como tokens `@theme`, solo en `dark:`
- Empty-state de `StoryDetail` (sin story seleccionada): ícono + texto centrados vertical
  y horizontalmente en el panel principal
- 3 mocks nuevas (`MOCK-0006/0007/0008`) cubriendo casos no probados antes: sin Labels,
  sin sección User Story (Spike), y muchos Labels (wrap visual)

Todo esto vive en el PR [`lbecjx/backlog-viewer#1`](https://github.com/lbecjx/backlog-viewer/pull/1),
sin mergear a `main` todavía al momento de este guardado.

### Siguiente paso
Nada pendiente en el alcance original de esta story (ACs #4/#5 siguen siendo trabajo del
OTRO repo, `claude-plugins/local-backlog` — ver abajo). Del lado de este repo, lo único
abierto es mergear el PR #1 de arriba y, después, reconstruir+copiar el `dist/` al
plugin (su propia rama `fix/dist-rebuild` quedó desactualizada respecto a este pulido).

**Preguntas abiertas para el humano — actualizado 2026-09-08:**
1. ~~¿Dónde vive exactamente el `dist/` servido respecto a `backlog/`?~~ Resuelto en
   parte: NO se acopla a `backlog/` en absoluto (descartadas ambas opciones que lo
   hacían). El skill solo sirve un `dist/` propio del repo del plugin, en una ruta fija
   todavía sin confirmar (propuesta: `skills/open-local-backlog/dist/`). Esto es trabajo
   del OTRO repo (`claude-plugins/local-backlog`) — deliberadamente pausado para
   enfocar primero en esta app React (decisión del humano, 2026-09-08).
2. **Resuelto parcialmente (2026-09-08):** versionado semver independiente en las 3
   líneas (esta app React, plugin `local-backlog`, plugin `workflow-dev`) — bumpean sin
   relación entre sí. La trazabilidad no es "misma versión", es un tag en el commit de
   este repo (ej. `viewer-v0.1.0`) referenciado en el CHANGELOG del plugin cuando se
   embebe ese build. Este repo ya en `0.1.0` (`package.json`). Sigue sin resolver el
   mecanismo EXACTO de copia (manual vs. script) — no bloqueante todavía.
3. Ya no aplica — no hay subcarpeta de assets dentro de `backlog/` en el diseño final.

---

## 5. Plan

### Task Group 1: Conectar Tailwind
- [x] Agregar `tailwindcss()` a `vite.config.ts`
- [x] Reemplazar `src/index.css` por el entry point de Tailwind v4 (`@import "tailwindcss"`)
**Validates:** prerequisito de TG6 (UI)
**After completion:** `pnpm build`/`pnpm lint` → verificado limpio → commit

### Task Group 2: Entorno de desarrollo con el mecanismo real
- [x] Proxy en `vite.config.ts`: `/backlog/*` → `http://localhost:8001`, con `rewrite`
      para pelar el prefijo
- [x] Script `dev:server` en `package.json` (`python3 -m http.server 8001 --directory public/backlog`)
- [x] `README.md` documentando el flujo de 2 terminales
**Validates:** prerequisito de TG3 — verificado end-to-end con `curl` (5 mocks listados
correctamente, fetch individual de un `.md` trae el contenido crudo)
**After completion:** `/workflow-dev:validate` → fix → commit

### Task Group 3: Módulo de descubrimiento de stories
- [x] `src/lib/discoverStories.ts` — fetch de `/backlog/`, parseo del listado HTML,
      filtro `^[A-Z]{2,6}-\d{4}-.*\.md$`, fetch individual de cada `.md`
- [x] Instalar y configurar Vitest + jsdom (primera vez en este repo)
- [x] Tests contra los 5 mocks reales — 5/5 pasan
**Validates:** AC #1, #2.g
**After completion:** `/workflow-dev:validate` → fix → commit

### Task Group 4: Parser de Markdown de una story
- [x] `src/lib/parseStory.ts` — separa metadata (tabla) de cuerpo, defaults si la tabla
      está incompleta/malformada
- [x] Decisión: el fix de continuación multi-línea NO va acá — este parser preserva el
      body verbatim; renderizarlo bien es responsabilidad de TG5 (librería MD
      establecida, no un renderer casero como el de la versión Python vieja)
- [x] Tests contra los 5 mocks — 6/6, incluyendo MOCK-0003 (multi-línea preservado
      intacto en el body) y MOCK-0004 (defaults sin crashear)
**Validates:** AC #2.e, #2.f
**After completion:** `/workflow-dev:validate` → fix → commit

### Task Group 5: Render seguro de Markdown
- [x] Librería elegida: `marked` (v18)
- [x] Sanitizar con DOMPurify antes de insertar — comentario documentando el contrato
      de origen y el modelo de amenaza REAL (distinto al de `CodeBlock`/Shiki, ver
      Descubrimientos)
- [x] 2 tests de seguridad verificados discriminantes con la técnica de romper/probar/
      restaurar (fallan sin sanitización, pasan con ella)
**Validates:** AC #3
**After completion:** `/workflow-dev:validate` → fix → commit

### Task Group 6: UI — lista + detalle
- [x] Panel izquierdo: cards buscables, buscador (código/título/cuerpo completo), chips
      de estado (toggle) — dinámicos según los status reales presentes, no hardcodeados
- [x] Panel derecho: detalle renderizado de la story seleccionada
- [x] Tests de comportamiento: buscar filtra (incluye texto del body, no solo título),
      click en chip filtra y des-filtra, click en card llama a onSelect — 5 tests
- [x] Dark mode (`dark:` de Tailwind, sigue `prefers-color-scheme`, sin toggle manual —
      no pedido) + `@tailwindcss/typography` para que `prose`/`prose-invert` styleen
      el Markdown renderizado (encontrado en verificación visual: sin el plugin, headers/
      listas se veían sin estilo por el reset agresivo de Tailwind v4)
- [x] Verificación visual real en navegador: las 5 mocks cargan con metadata correcta,
      MOCK-0003 confirma AC #1 multi-línea absorbido en un solo ítem (no reintrodujo el
      bug), búsqueda por texto del body funciona ("luhn" encuentra solo MOCK-0003),
      dark mode correcto
- [x] Pulido visual adicional (feedback directo sobre screenshots reales):
  - Labels con color determinístico por hash (`lib/labelColor.ts`) — antes se parseaban
    pero nunca se mostraban
  - Estado con color semántico (`lib/statusColor.ts`): verde=Done, azul=In Progress,
    gris=Not Started, ámbar=cualquier estado no estándar (ej. "Bloqueado por vendor")
  - Tachado (`line-through`) en el título de card cuando Estado=Done, y en los
    checkboxes tildados del Markdown renderizado — patrón investigado y confirmado
    como convención establecida (Trello, Obsidian, listas GFM)
  - Barra de acento a la izquierda de cada card, color = Estado, sin redondeo en esa
    esquina (`rounded-r-lg` en vez de `rounded-lg`)
  - Tipo (Story/Bug/etc.) con badge de color + ícono (`lib/typeColor.ts`) — a diferencia
    de Estado (set cerrado, un outlier es alarma), Tipo es abierto como Labels, así que
    un tipo no reconocido cae al mismo hash de color de `labelColor.ts` en vez de un
    color fijo de "atención"
  - `cursor-pointer` explícito en cards y chips (los `<button>` nativos no lo traen por
    defecto, a diferencia de `<a>`)
  - Logo (`components/Logo.tsx`): ícono estilo "app icon" (cuadrado índigo sólido, SVG
    en blanco) + wordmark "local-backlog" en bold + "by @lbecjx" linkeado a
    github.com/lbecjx, arriba del buscador con un divisor debajo
  - Versión (`v0.1.0`, chica, gris) al lado del wordmark — inyectada vía
    `__APP_VERSION__` (define de Vite leyendo `package.json` en build time, no un
    string hardcodeado que se desincroniza)
  - **Resaltado de sintaxis real con Shiki** (tema `dracula`, mismo criterio que
    `notebooks`): API fine-grained (`createHighlighterCore` + engine JS puro) para
    solo cargar los lenguajes que este backlog usa (js/ts/python/bash/json), no el
    paquete completo. Confirmado con `getComputedStyle` que corre Cascadia Code.
**Validates:** AC #2.a-d
**After completion:** `/workflow-dev:validate` → fix → commit

### Task Group 7: Verificación visual manual
- [x] Con `pnpm dev` + `pnpm dev:server` corriendo: crear/editar/borrar un mock a mano,
      confirmar que F5 refleja el estado real sin correr nada más
- [x] **Encontró un bug real de caché** (ver Descubrimientos) — el primer intento
      falló: editar `Estado` de MOCK-0002 no se reflejaba con F5. Fix aplicado y
      re-verificado con el mismo ciclo completo (crear+editar+borrar) hasta confirmar
      que sí funciona de punta a punta
**Validates:** AC #6
**After completion:** commit final

### Plan Progress
| # | Task Group | Estado |
|---|-----------|--------|
| 1 | Conectar Tailwind | Done |
| 2 | Entorno de desarrollo con el mecanismo real | Done |
| 3 | Módulo de descubrimiento de stories | Done |
| 4 | Parser de Markdown de una story | Done |
| 5 | Render seguro de Markdown | Done |
| 6 | UI — lista + detalle | Done |
| 7 | Verificación visual manual | Done |

---

## 4. Archivos tocados

| Archivo | Acción | Qué se hizo |
|---------|--------|-------------|
| `.workflow-dev/config.json` | nuevo | `{ "gitignored": false }` |
| `.workflow-dev/context/REPO.md` | nuevo | Contexto de repo completo (stack, convenciones, prohibitions, estado real del scaffold) |
| `.workflow-dev/context/STORY_LOCAL_BACKLOG_VIEWER.md` | nuevo | Este archivo |
| `public/backlog/MOCK-0001..0005-*.md` | nuevo | 5 stories mock para desarrollo (sana, in-progress, multi-línea, tabla malformada, bloques de código) |
| `vite.config.ts` | modificado | + plugin `tailwindcss()`, + proxy `/backlog` → `http.server` local con rewrite |
| `src/index.css` | modificado | CSS por defecto del scaffold → entry point de Tailwind v4 |
| `package.json` | modificado | + script `dev:server` |
| `README.md` | modificado | Documentado qué es este repo y el flujo de 2 terminales |
| `src/lib/discoverStories.ts` | nuevo | Descubrimiento en vivo: listado + fetch individual |
| `src/lib/discoverStories.test.ts` | nuevo | 5 tests contra el server real (puerto 8002 dedicado a tests) |
| `vitest.config.ts` + `vitest.global-setup.ts` | nuevo | Config de Vitest (jsdom) + spawn/kill del server de test |
| `package.json` | modificado | + `vitest`, `jsdom` en devDependencies; + script `test` |
| `src/lib/parseStory.ts` | nuevo | Metadata + body, defaults, `extractCodeFromFilename` |
| `src/lib/parseStory.test.ts` | nuevo | 6 tests contra los mocks reales (vía `fetchStoryRaw`) |
| `src/lib/renderMarkdown.ts` | nuevo | `marked` + DOMPurify, contrato de origen documentado |
| `src/lib/renderMarkdown.test.ts` | nuevo | 6 tests, 2 de seguridad verificados discriminantes |
| `package.json` | modificado | + `marked`, `dompurify` en dependencies |
| `src/lib/computeAcProgress.ts` (+test) | nuevo | Progreso de ACs desde el patrón `✅/🔧/⬜` |
| `src/hooks/useBacklogStories.ts` | nuevo | Orquesta discover+parse+progress, expone stories/loading/error |
| `src/components/{StoryList,StoryCard,StoryDetail,StatusChip,LabelBadge,Logo}.tsx` | nuevo | UI completa |
| `src/lib/discoverStories.ts` | modificado | Fix del bug de caché: `{ cache: 'no-store' }` en ambos `fetch()` |
| `vite.config.ts`, `src/vite-env.d.ts` | modificado/nuevo | `__APP_VERSION__` inyectado desde `package.json` para mostrar la versión en el logo |
| `package.json` | modificado | `version: 0.0.0 → 0.1.0` — primer versionado real de este repo, independiente del de los plugins |
| `src/index.css` | modificado | Token `--font-cascadia` (NO `--font-mono` — ese lo usan también los códigos de las cards, que deben quedar en el monospace del sistema) + imports `latin-{400,600}.css` (mismo criterio anti-bloat que `notebooks`) |
| `src/components/StoryDetail.tsx` | modificado | `[&_pre]:font-cascadia [&_code]:font-cascadia`; restructurado en `StoryDetail`+`StoryBody` (keyed por código) para el render async de Shiki sin warning de lint |
| `src/lib/highlighter.ts` | nuevo | Highlighter Shiki compartido, fine-grained, tema `dracula`, langs js/ts/python/bash/json |
| `src/lib/renderMarkdown.ts` | modificado | `walkTokens` para correr Shiki en cada bloque de código; `renderMarkdownToSafeHtml` ahora async; `span`/`style` agregados al allowlist de DOMPurify |
| `src/lib/renderMarkdown.test.ts` | modificado | Tests async; nuevo test de fallback a `text` para lenguaje no cargado; test de bloques de código verifica `class="shiki` + spans de color reales |
| `package.json` | modificado | + `shiki` en dependencies |
| `src/lib/typeColor.ts` (+test) | nuevo | Color+ícono por Tipo, fallback a `labelColor` |
| `src/lib/{labelColor,statusColor,typeColor}.ts` (+tests) | nuevo | Color determinístico por label / semántico por Estado / color+ícono por Tipo |
| `src/App.tsx`, `src/index.css` | modificado | Reemplazo del demo del scaffold; dark mode; `@tailwindcss/typography` |
| `tsconfig.app.json` | modificado | `include` agrega `vitest.setup.ts` (fix de tipos de jest-dom en `tsc -b`) |
| `package.json` | modificado | + `@testing-library/*`, `@tailwindcss/typography` |
| `src/lib/parseStory.ts` (+test) | modificado | Eliminado el fallback a claves en español; `field()` ahora toma un solo `key` |
| `public/backlog/MOCK-000{1..5}-*.md` | modificado | Tablas de metadata migradas a claves en inglés (`Field/Value`, `Code/Type/...`) — el body en español queda igual |
| `src/lib/discoverStories.test.ts` | modificado | Conteo/lista esperada 5→8 tras sumar las 3 mocks nuevas |
| `public/backlog/MOCK-0006-story-no-labels-done.md` | nuevo | Caso: sin `Labels` en la tabla |
| `public/backlog/MOCK-0007-spike-no-user-story.md` | nuevo | Caso: `Type: Spike` sin sección User Story |
| `public/backlog/MOCK-0008-bug-many-labels.md` | nuevo | Caso: 6 labels, prueba wrap visual |
| `package.json`, `index.html` | modificado | Rename `local-backlog`→`backlog-viewer` / título `Backlog Viewer`; + `"license": "GPL-3.0-or-later"`; `index.html` además lleva su propia nota de copyright (única excepción del repo) |
| `README.md` | modificado | Título, sección License (bloque GPL completo + Copyright + Author), "Recommended alongside" reformulado sin nombrar Jira |
| `LICENSE` | nuevo | Texto completo GPL-3.0 |
| `CHANGELOG.md` | nuevo | Entradas 0.1.0 / 0.1.1 |
| `src/components/Logo.tsx` | modificado | Simplificado a solo wordmark "Backlog Viewer" — versión/autor se movieron al footer |
| `src/App.tsx` | modificado | Footer nuevo (© / licencia con link a LICENSE / versión con link al repo / autor con link al perfil), `aside` separa `pt`/`px` de `pb` para poder controlar el padding del footer de forma independiente |
| `src/components/StoryDetail.tsx` | modificado | Empty-state con ícono SVG + texto centrados (`flex flex-col items-center justify-center`, `h-full`); texto sin tilde ("Selecciona" en vez de "Seleccioná"); clases `prose-*` con colores Dracula en `dark:` |
| `src/index.css` | modificado | Tokens `--color-dracula-{purple,cyan,yellow,green,comment}` en `@theme`, verificados contra `@shikijs/themes/dracula.mjs` real antes de usarlos |
| `.gitignore`, repo GitHub | nuevo | Repo creado (`gh repo create lbecjx/backlog-viewer --public`), rama `main` protegida vía API de GitHub |

---
