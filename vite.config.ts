import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// Bundle analyzer is OPT-IN: run `ANALYZE=true npm run build`.
// It generates stats.html showing module sizes (gzip + brotli).
const analyze = process.env.ANALYZE === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    analyze &&
      visualizer({
        filename: 'stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  test: {
    globals: true, // describe/it/expect available without imports
    environment: 'jsdom', // browser-like DOM for component tests
    setupFiles: './src/test/setup.ts', // runs before each test file
    css: false, // skip CSS processing in tests (we don't test styles)
  },
})
