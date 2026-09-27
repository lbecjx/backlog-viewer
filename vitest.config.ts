import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig({
  // Mirrors vite.config.ts's own define — vitest.config.ts doesn't inherit it,
  // and App.tsx reads `__APP_VERSION__` at render time.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    globalSetup: './vitest.global-setup.ts',
    setupFiles: './vitest.setup.ts',
  },
})
