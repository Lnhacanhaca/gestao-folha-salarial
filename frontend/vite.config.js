import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ...existing config...
  server: {
    // Accept requests that come from the Nginx reverse‑proxy
    host: true,               // listen on all network interfaces
    strictPort: false,
    // Enable proxy‑origin header acceptance
    // (or set `origin` in `server` if you have a fixed domain)
    // For Vite ≥4 you can also set:
    cors: {
      origin: '*',            // allow any origin (dev only)
    },
  },
});