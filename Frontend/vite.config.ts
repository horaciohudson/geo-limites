import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:9010'
  const assetBase = mode === 'desktop' ? './' : '/'

  return {
    base: assetBase,
    plugins: [react()],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/graphics-engine': path.resolve(__dirname, './src/graphics-engine'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/auth': path.resolve(__dirname, './src/auth'),
        '@/routes': path.resolve(__dirname, './src/routes')
      }
    },
    server: {
      port: 3004,
      host: true,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
          timeout: 900000,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router-dom')) {
                return 'router-vendor'
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              if (id.includes('axios')) {
                return 'network-vendor'
              }
              if (id.includes('three') || id.includes('dxf-viewer')) {
                return 'cad-viewer-vendor'
              }
            }

            if (
              id.includes('/src/auth/')
              || id.includes('/src/services/api.ts')
            ) {
              return 'auth-core'
            }

            if (
              id.includes('/src/graphics-engine/')
            ) {
              return 'cad-editor'
            }

            return undefined
          }
        }
      }
    }
  }
})
