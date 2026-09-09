import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

// Fine-grained API + a pure-JS engine (no WASM, no oniguruma) — the full `shiki`
// entrypoint bundles every language it ships via internal dynamic imports that
// aren't tree-shakeable, ballooning the build with languages never requested
// (this exact bloat was found and fixed once already in notebooks). Loading only
// the languages this backlog's own stories actually use keeps the bundle lean.
// Shared instance, not one per render — building a highlighter reloads grammars.
export const highlighterPromise: Promise<HighlighterCore> = createHighlighterCore({
  themes: [import('shiki/themes/dracula.mjs')],
  langs: [
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/python.mjs'),
    import('shiki/langs/bash.mjs'),
    import('shiki/langs/json.mjs'),
  ],
  engine: createJavaScriptRegexEngine(),
})
