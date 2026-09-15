import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // the real backend (server/index.js) runs separately on :4000;
      // proxying keeps the browser same-origin so session cookies work
      // without any CORS configuration
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
