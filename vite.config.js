import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// El frontend SIEMPRE llama a /api (mismo origen); nunca ve la URL de Supabase
// ni la anon key. En dev, el proxy reenvía /api al backend elegido:
//   - por defecto → la Edge Function en Supabase (/functions/v1 + /api/...)
//   - para volver al Express local → VITE_API_TARGET=http://localhost:3001
// En prod, Cloudflare hace este mismo proxy (origen único, cookies first-party).
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'https://tqdnomtugpbrgswlcwmi.supabase.co/functions/v1'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true, secure: true },
      },
    },
  }
})
