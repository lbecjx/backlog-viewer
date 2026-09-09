import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forwards to a real `python3 -m http.server` (see `pnpm dev:server`) so the
      // app talks to the exact same directory-listing mechanism it'll use in
      // production — Vite's own dev server doesn't auto-list directories, so it
      // can't stand in for this. The target server's root IS public/backlog/, so
      // the /backlog prefix is stripped before forwarding.
      '/backlog': {
        target: 'http://localhost:8001',
        rewrite: (path) => path.replace(/^\/backlog/, ''),
      },
    },
  },
})
