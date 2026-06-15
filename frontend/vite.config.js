import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server chay o cong 5173 (khop voi CORS backend)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
  },
})
