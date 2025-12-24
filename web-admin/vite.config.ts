import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
    },
  },
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Chunk size warning threshold (KB)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI core (most used)
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          // MUI icons (large but tree-shakeable)
          'vendor-mui-icons': ['@mui/icons-material'],
          // Charts (only load when needed)
          'vendor-charts': ['recharts'],
          // Date utilities
          'vendor-date': ['dayjs', 'date-fns'],
          // Forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // State management & data fetching
          'vendor-state': ['zustand', '@tanstack/react-query', 'axios'],
        },
        // Better chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          if (facadeModuleId.includes('/pages/')) {
            const pageName = facadeModuleId.split('/pages/')[1]?.split('/')[0] || 'page';
            return `pages/${pageName}-[hash].js`;
          }
          return 'chunks/[name]-[hash].js';
        },
        // Asset file naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Entry file naming
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
  },
})
