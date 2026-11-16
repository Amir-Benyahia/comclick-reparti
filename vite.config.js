import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite sert les pages sur le port 5173.
// Tout ce qui passe par /socket.io est renvoyé vers le serveur Node (port 3001).
// Comme ça, téléphone et écrans n'ont qu'une seule adresse à connaître.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api': { target: 'http://localhost:3001' },
    },
  },
})
