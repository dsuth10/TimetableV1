import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.jsx',
    // Add file exclusions to prevent EMFILE errors
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/coverage/**',
      '**/cypress/**'
    ],
    // Mock heavy dependencies to prevent file descriptor issues
    deps: {
      inline: ['@mui/icons-material']
    },
    // Memory optimization settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        minForks: 1
      }
    },
    // Limit concurrent tests to reduce memory usage
    maxConcurrency: 1,
    // Add memory limits
    hookTimeout: 10000,
    testTimeout: 10000,
    // Reduce memory usage by limiting test file processing
    isolate: true,
    // Optimize test execution
    sequence: {
      shuffle: false
    }
  },
  // Add memory optimization for Vite
  server: {
    hmr: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}) 