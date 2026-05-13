/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true, // describe/it/expect available without imports
    environment: 'jsdom', // browser-like DOM for component tests
    setupFiles: './src/test/setup.ts', // runs before each test file
    css: false, // skip CSS processing in tests (we don't test styles)
  },
})
