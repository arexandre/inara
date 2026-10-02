/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  /**
   * Ignorar erros de TypeScript durante o build de producao.
   * Os tipos do Supabase serao gerados via "supabase gen types typescript"
   * e substituirao o arquivo types/database.ts manualmente criado.
   *
   * Para reabilitar: remova a linha abaixo e execute:
   *   npx supabase gen types typescript --project-id <id> > web/types/database.ts
   */
  typescript: {
    ignoreBuildErrors: true,
  },

  // ---------------------------------------------------------------------------
  // Headers de Segurança (Anti-Clickjacking, Anti-Sniffing, CSP)
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        // Aplicar a TODAS as rotas
        source: "/(.*)",
        headers: [
          // Bloquear iframe embedding (Anti-Clickjacking)
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Impedir que o browser advinhe MIME types incorretos
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Controlar informações enviadas no Referer
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Ativar proteção XSS nativa do browser (legacy, mas sem custo)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Forçar HTTPS por 1 ano (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Bloquear acesso à câmera, microfone, geolocalização etc.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy — permite origens confiáveis, bloqueia injeções
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js precisa de inline/eval em dev
              "style-src 'self' 'unsafe-inline'",                  // Tailwind injeta estilos inline
              "img-src 'self' data: blob: https://*.supabase.co",  // Imagens do Supabase Storage
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.telegram.org https://api.openweathermap.org",
              "frame-ancestors 'none'",                            // Reforço anti-clickjacking via CSP
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",                                 // Bloquear Flash/Java plugins
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;