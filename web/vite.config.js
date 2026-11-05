import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

const commit = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' } })()
const quando = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  base: '/',
  define: { __VERSIONE__: JSON.stringify(commit + ' \u00b7 ' + quando) },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Menta Peperita',
        short_name: 'Menta Peperita',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#4A7320',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      injectRegister: false,
      workbox: { navigateFallback: '/index.html', cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true }
    })
  ]
})
