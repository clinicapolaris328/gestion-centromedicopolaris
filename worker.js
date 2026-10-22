// Worker de Cloudflare: sirve el frontend estático y proxea /api/* → la Edge
// Function de Supabase (mismo origen para el navegador, cookies httpOnly
// first-party). El navegador nunca ve la URL de Supabase.
//
// - /api/*  → proxy a Supabase (server-side)
// - resto   → assets estáticos (con fallback SPA vía not_found_handling)

const FALLBACK_UPSTREAM = 'https://tqdnomtugpbrgswlcwmi.supabase.co/functions/v1'

// Headers de seguridad para el front (HTML/app). Clave anti-clickjacking:
// X-Frame-Options + CSP frame-ancestors (la app nunca debe embeberse en un iframe).
// CSP acotado a lo que usa la SPA (Vite):
//  - script-src 'self'  → JS bundleado, sin inline (mitiga XSS).
//  - style-src 'unsafe-inline' + Google Fonts → estilos inline (style={{}}) y el @import de Poppins.
//  - font-src gstatic → archivos de la fuente. connect-src 'self' → fetch a /api (mismo origen).
//  - frame-ancestors 'none' → anti-clickjacking. object/base/form endurecidos.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

function conSeguridad(resp) {
  const headers = new Headers(resp.headers)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const upstream = env.SUPABASE_FUNCTIONS_URL || FALLBACK_UPSTREAM
      const target = upstream + url.pathname + url.search
      const resp = await fetch(new Request(target, request))
      // Devuelve la respuesta tal cual, incluyendo Set-Cookie (la API pone sus
      // propios security headers vía Hono secureHeaders).
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      })
    }

    // Todo lo demás → assets estáticos (fallback SPA lo maneja el binding) + headers.
    return conSeguridad(await env.ASSETS.fetch(request))
  },
}
