import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Página de login do Inara.
 * Usa autenticação Magic Link (email) via Supabase Auth.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Já autenticado → vai para o dashboard
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fdfaf7] px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Cabeçalho */}
        <div className="space-y-2 text-center">
          <h1 className="font-display text-4xl font-semibold text-stone-800">
            inara
          </h1>
          <p className="text-sm text-stone-500">
            Seu lar, organizado com carinho.
          </p>
        </div>

        {/* Card de login */}
        <div className="card p-8 space-y-6">
          {params.sent && (
            <div className="rounded-xl bg-sage-50 border border-sage-200 p-3 text-sm text-sage-700">
              ✉️ Link enviado! Verifique seu e-mail.
            </div>
          )}
          {params.error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          <form action="/auth/login" method="POST" className="space-y-4">
            <input type="hidden" name="redirect" value={params.redirect ?? "/dashboard"} />

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="voce@casa.com"
                className="w-full rounded-2xl border border-warm-300 bg-white px-4 py-2.5
                           text-stone-800 placeholder:text-stone-400
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                           transition"
              />
            </div>

            <button type="submit" className="btn-primary w-full justify-center">
              Entrar com Magic Link ✨
            </button>
          </form>

          <p className="text-center text-xs text-stone-400">
            Acesso restrito aos moradores cadastrados.
          </p>
        </div>
      </div>
    </main>
  );
}
