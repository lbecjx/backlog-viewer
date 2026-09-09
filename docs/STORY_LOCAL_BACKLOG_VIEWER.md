# Épica: reescribir el visor de `local-backlog` como app React con lectura en vivo

## 0. Resumen ejecutivo

`local-backlog` es un plugin de Claude Code (repo separado en
`~/Projects/claude-plugins/local-backlog/`) que da a un proyecto sin acceso a Jira un
sustituto local: tickets en Markdown con código auto-incremental (`<PREFIX>-XXXX`) y un
visor tipo Jira (lista buscable + detalle de cada story).

Hoy el visor es un único script Python (`scripts/build_backlog_index.py`) que lee todos
los `.md` de la carpeta `backlog/` de un proyecto, embebe su contenido como JSON dentro
de un `index.html` autocontenido, y lo abre. Funciona, pero cada cambio a una story
(tildar un AC, cambiar el Estado) exige volver a correr el generador y refrescar a mano.

Esta épica reemplaza ese `index.html` estático por una app **React + TypeScript + Vite**
que lee las stories **en vivo** desde disco en cada carga de página — sin generar nada
salvo el build de la propia app, que se hace una sola vez, en desarrollo.

## 1. Dos proyectos, una sola función — no confundirlos

| | Este proyecto (`~/Projects/web/local-backlog/`) | El plugin (`~/Projects/claude-plugins/local-backlog/`) |
|---|---|---|
| Qué es | Código fuente de la app (React, TS, Vite, Tailwind, pnpm) | El plugin de Claude Code instalable — 2 skills + el visor ya compilado |
| Qué se versiona | Todo el proyecto normal (`src/`, `package.json`, etc.) | Solo `dist/` (el build de este proyecto) + los `SKILL.md` — nunca `node_modules/` ni el código fuente de React |
| Quién lo toca | El autor del plugin (vos), en desarrollo | Cualquiera que instale el plugin — nunca corre `npm`/`pnpm`, nunca ve React |
| Cómo se conectan | `pnpm build` acá genera `dist/` → ese `dist/` se copia a mano (o vía script de release) al repo del plugin | El skill `open-local-backlog` sirve ese `dist/` con `python3 -m http.server` |

**Por qué esta separación:** el plugin publicado debe seguir sin dependencias para quien
lo instala (ni Node, ni `npm install`, solo Python — que el plugin ya requiere para otras
cosas). Meter el proyecto React completo en el repo del plugin rompería esa promesa.

## 2. Contexto e historia — de dónde viene esto

El plugin `local-backlog` nació dentro de `workflow-dev` (entonces `lcdd`), como una sola
skill (`create-local-story`) para proyectos personales sin Jira. Con el tiempo se le sumó
`open-local-backlog` y el generador Python. Al reorganizar `workflow-dev` en dos plugins
independientes (separación de responsabilidades: memoria persistente + workflow por un
lado, administración de backlog local por otro), quedó claro que el generador estático
ya no alcanzaba — cada edición de una story obligaba a un ciclo manual de
regenerar-y-refrescar que no tenía por qué existir.

La alternativa evaluada y descartada primero: reescribir el visor como app React servida
con su propio dev server (`pnpm dev`), consumida directamente por quien instala el
plugin. Se descartó porque exige que el usuario final tenga Node/pnpm instalados y corra
un proceso de desarrollo solo para ver tickets — contradice la razón de ser del plugin
("cero dependencias, no hace falta cuenta ni server externo").

La solución adoptada: **construir la app una sola vez, en desarrollo, embeber en el
`dist/` publicado, y servir ese `dist/` en runtime con algo que el plugin ya requiere**
(Python, vía `http.server`) en vez de con Node. React y todo su tooling quedan del lado
del autor; quien instala el plugin solo necesita Python.

## 3. El problema técnico central — cómo lee stories sin generar nada

Un navegador no puede preguntarle a un servidor de archivos estático "¿qué archivos hay
en esta carpeta?" — `fetch()` solo trae el contenido de un archivo cuyo nombre ya se
conoce de antemano. La solución elegida explota una feature nativa de
`http.server`/`SimpleHTTPRequestHandler`: si se pide la URL de una carpeta que no tiene
su propio `index.html`, Python genera automáticamente una página HTML con un `<a href>`
por cada archivo de esa carpeta.

Flujo resultante, en cada carga de la app (F5 incluido):

1. La app pide (`fetch`) la carpeta donde viven las stories (ver Decisión Pendiente #1
   más abajo sobre dónde exactamente).
2. Python devuelve el listado HTML autogenerado.
3. La app parsea ese HTML, extrae los `href`, y se queda solo con los que matchean
   `^[A-Z]{2,6}-\d{4}-.*\.md$` (mismo patrón que ya usa `build_backlog_index.py` — no
   asume un prefijo fijo tipo `NB`, funciona con el que cada proyecto haya elegido).
4. Por cada nombre de archivo que sobrevive el filtro, la app hace `fetch()` de ese
   archivo puntual y trae su contenido Markdown crudo.
5. Parsea cada Markdown (metadata de la tabla + cuerpo) y renderiza.

**Consecuencia directa:** no existe manifest, no existe paso de generación, no hay nada
que quede desincronizado. Crear, editar, o borrar un `.md` a mano y refrescar el
navegador siempre muestra el estado real y actual del disco.

## 4. Arquitectura y stack

| Capa | Elección | Nota |
|---|---|---|
| Framework | React (última estable) | Mismo patrón que otros proyectos personales: Atomic Design (atoms → molecules → organisms) |
| Lenguaje | TypeScript, modo estricto | `noUnusedLocals`, `noUnusedParameters` activos |
| Build | Vite | Ya scaffoldeado con `pnpm create vite local-backlog --template react-ts` |
| Paquetes | **pnpm**, nunca npm | Estándar ya establecido para todo proyecto JS/TS nuevo |
| Estilos | Tailwind CSS v4 vía `@tailwindcss/vite` | Ya agregado al scaffold |
| Runtime del visor publicado | `python3 -m http.server` | Ya es dependencia del plugin (antes usado para el generador); no se suma Node como dependencia nueva |

## 5. Qué debe hacer la app (paridad funcional con el generador actual + mejoras)

Del visor Python actual (`build_backlog_index.py`), preservar:

1. Panel izquierdo: lista de cards buscable (código, título, tipo, estado, progreso de ACs)
2. Buscador: matchea código, título, y texto completo del cuerpo
3. Chips de estado: click para filtrar, click de nuevo para limpiar el filtro
4. Panel derecho: la story seleccionada, renderizada desde su Markdown
5. Metadata leída de la tabla de cada story (Código/Tipo/Prioridad/Estado/Labels) — una
   tabla malformada debe caer a defaults razonables, nunca romper el render
6. Manejo correcto de listas multi-línea en el Markdown (bug ya resuelto una vez en la
   versión Python: una línea de continuación de un ítem de lista no debe crear un ítem
   nuevo ni renumerar la lista)
7. Filtrado de archivos por el patrón `^[A-Z]{2,6}-\d{4}-` — agnóstico al prefijo elegido
   por cada proyecto

Nuevo respecto a la versión Python:

8. Lectura en vivo (Sección 3) — sin paso de generación, nunca desincronizado
9. Manejo de errores explícito y visible para el humano (ver Sección 7)

## 6. Seguridad — renderizar Markdown ajeno sigue siendo territorio con riesgo

El contenido de cada `.md` es, en teoría, texto de confianza (lo escribe el propio
dueño del proyecto), pero renderizar Markdown a HTML e insertarlo en el DOM sigue
exigiendo la misma disciplina que ya se aplicó en otros proyectos personales (ver
`CodeBlock` de `notebooks`, que sanitiza con DOMPurify la salida de Shiki antes de
`dangerouslySetInnerHTML`, documentando el contrato de origen del contenido):

- Usar un parser de Markdown a HTML establecido (no reinventar uno a mano)
- Sanitizar la salida antes de insertarla en el DOM (DOMPurify, mismo patrón que
  `CodeBlock`), aun asumiendo que el contenido es de confianza — defensa en profundidad
  contra un bug del parser o un cambio futuro de dónde vienen las stories
- Documentar en el código el contrato de origen (¿de dónde puede venir el `.md` que se
  renderiza? ¿siempre del disco local, nunca de un fetch a un tercero?)

## 7. Manejo de errores — el skill debe avisar, no fallar en silencio

Dos fallos reales que el skill `open-local-backlog` (que lanza el server) debe detectar
y comunicarle al humano con un mensaje claro, no un stack trace crudo:

1. **`python3` no está instalado** — chequear con `command -v python3` antes de intentar
   levantar nada. Si falta, decirle al humano que lo instale (con un puntero, ej.
   python.org o `brew install python3` en Mac) y parar ahí.
2. **El puerto elegido ya está en uso** — evitarlo de raíz arrancando con puerto `0`
   (el SO asigna uno libre), leer qué puerto le tocó, y abrir el navegador en esa URL
   específica. Si aun así el arranque falla, mostrar el error real de Python, no
   tragárselo.

## 8. Decisiones pendientes — a resolver en `/workflow-dev:plan`, no asumidas de antemano

⬜ **Dónde vive exactamente el `dist/` servido respecto a la carpeta `backlog/` del
proyecto consumidor.** Para que la app pueda hacer `fetch()` de las stories como
archivos "hermanos" (Sección 3), el `http.server` tiene que arrancar con `backlog/`
(o una carpeta que la contenga) como raíz. Opciones a evaluar en el plan:
  - Copiar los assets del `dist/` directo dentro de `backlog/` (conviven con los `.md`,
    filtrados por el mismo regex de la Sección 3 al listar)
  - Servir desde `backlog/` apuntando a una subcarpeta de assets (`backlog/.viewer/`) y
    hacer `fetch('../')` desde ahí para llegar a las stories
  - Alguna otra estructura que evite ensuciar `backlog/` con archivos que no son stories

⬜ **Cómo se sincroniza `dist/` del proyecto React al repo del plugin.** ¿Un paso manual
(`pnpm build` acá, copiar a mano al repo del plugin), o un script de release que lo
automatice? No bloqueante para la primera versión funcional, pero hay que decidirlo
antes de considerar esto "listo para publicar".

⬜ **Nombre exacto de la carpeta de assets servidos** (si se opta por la opción de
subcarpeta) y si esa carpeta necesita excluirse explícitamente del regex de detección de
stories para no aparecer nunca en el listado ni en el buscador.

## 9. Fuera de alcance (por ahora)

- Editar una story desde el visor (sigue siendo de solo lectura, igual que hoy)
- Cualquier backend real, base de datos, o autenticación
- Empaquetar/distribuir esto como algo separado del plugin `local-backlog`
- Soporte para que el usuario final del plugin corra `pnpm dev` — nunca debería
  necesitarlo

## 10. Definición de terminado

- [ ] La app lee stories en vivo desde `backlog/` sin ningún paso de generación
- [ ] Paridad funcional completa con `build_backlog_index.py` (Sección 5, ítems 1-7)
- [ ] Markdown sanitizado antes de insertarse en el DOM (Sección 6)
- [ ] El skill `open-local-backlog` detecta y reporta claramente los dos fallos de la
      Sección 7, en vez de fallar en silencio o con un stack trace crudo
- [ ] `pnpm build` genera un `dist/` que funciona serví­do con `python3 -m http.server`
      desde la ubicación decidida en la Sección 8
- [ ] Verificación visual real: crear, editar, y borrar una story a mano mientras el
      visor está abierto, confirmar que F5 siempre refleja el estado actual sin correr
      ningún comando adicional

---

> Para trabajar esta épica: `/workflow-dev:init docs/STORY_LOCAL_BACKLOG_VIEWER.md`
