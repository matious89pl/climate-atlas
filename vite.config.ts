import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind both IPv4 (0.0.0.0) and IPv6 (::) so http://localhost:5173 and
    // http://127.0.0.1:5173 both resolve — Safari prefers IPv4 for "localhost".
    host: true,
    port: 5173,
    strictPort: true,
  },
})
