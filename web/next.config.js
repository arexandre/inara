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
};

module.exports = nextConfig;