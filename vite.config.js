/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js')) {
              return 'vendor-chart'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
})
