import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'path'

const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version
// ponytail: 'unknown' fallback covers shallow/no-git CI checkouts
const gitCommit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'unknown' }
})()
const buildDate = new Date().toISOString().slice(0, 10)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  server: {
    port: 8849,
    strictPort: true,
  },
  preview: {
    port: 8849,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Three.js is only needed once the map mounts — keep it out of the
        // install-time precache and let it load on demand.
        globIgnores: ['**/three.module-*.js', '**/GLTFLoader-*.js', '**/SkeletonUtils-*.js'],
      },
      manifest: {
        name: 'Lorewalk',
        short_name: 'Lorewalk',
        description: 'Explore Singapore\'s history through geo-exploration',
        theme_color: '#1a0a2e',
        background_color: '#1a0a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
