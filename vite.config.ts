import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,webmanifest}'] },
      manifest: {
        id: '/',
        start_url: '/',
        scope: '/',
        name: 'Plan4Her',
        short_name: 'Plan4Her',
        description: 'A weekly planner that adapts to your real time and optional cycle context.',
        theme_color: '#FAFAFA',
        background_color: '#FAFAFA',
        display: 'standalone',
        icons: [
          {src:'/icons/pwa-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
          {src:'/icons/pwa-512.png',sizes:'512x512',type:'image/png',purpose:'any'}
        ]
      }
    })
  ]
})
