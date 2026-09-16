import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateProfileSettings } from "@/app/actions";
import AdminWidget from "./AdminWidget";

export const metadata = { title: "Perfil e Configurações" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: settings } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-3xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Perfil & Preferências</h1>
        <p className="text-stone-500 font-medium">Personalize sua experiência com a Inara.</p>
      </header>

      <form action={updateProfileSettings} className="space-y-8">
        {/* CONTEXTO PESSOAL E TEMA */}
        <section className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">Contexto Pessoal</h2>
            <p className="text-sm text-stone-500 mb-6">Como a Inara deve tratar você? Do que você gosta?</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Tema da Interface</label>
              <select name="theme_preference" defaultValue={profile?.theme_preference || 'system'} className="w-full bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="system">Sincronizar com o Sistema</option>
                <option value="light">☀️ Tema Claro</option>
                <option value="dark">🌙 Tema Escuro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Suas Preferências Pessoais</label>
              <textarea 
                name="personal_context" 
                defaultValue={profile?.personal_context || ""}
                rows={4}
                placeholder="Ex: Não gosto que me cobrem antes do almoço. Minha comida favorita é estrogonofe."
                className="w-full bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
        </section>

        {/* CONTEXTO RESIDENCIAL (ADMIN ONLY) */}
        {isAdmin && (
          <section className="bg-brand-50/50 dark:bg-brand-950/20 p-6 sm:p-8 rounded-3xl shadow-sm border border-brand-200 dark:border-brand-900/50 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl pointer-events-none">🛡️</div>
            <div>
              <h2 className="font-display text-2xl font-bold text-brand-800 dark:text-brand-300 mb-2">Governança da Casa</h2>
              <p className="text-sm text-brand-600/80 dark:text-brand-400/80 mb-6">Configurações globais (Acesso restrito ao Arquiteto).</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-800 dark:text-brand-300 mb-1">Endereço (Para Frete e Clima)</label>
                <input 
                  type="text" 
                  name="house_address" 
                  defaultValue={settings?.house_address || ""}
                  placeholder="Araguari, MG"
                  className="w-full bg-white dark:bg-stone-950 border border-brand-200 dark:border-brand-900/50 text-stone-800 dark:text-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-800 dark:text-brand-300 mb-1">Regras da Casa</label>
                <textarea 
                  name="house_rules" 
                  defaultValue={settings?.house_rules || ""}
                  rows={4}
                  placeholder="Ex: Lixo desce às 19h. Proibido calçados na sala."
                  className="w-full bg-white dark:bg-stone-950 border border-brand-200 dark:border-brand-900/50 text-stone-800 dark:text-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-800 dark:text-brand-300 mb-1">Ociosidade Mínima (Minutos)</label>
                <input
                  type="number"
                  name="idle_time_min"
                  defaultValue={settings?.idle_time_min || 120}
                  min={15}
                  max={1440}
                  className="w-32 bg-white dark:bg-stone-950 border border-brand-200 dark:border-brand-900/50 text-stone-800 dark:text-stone-200 font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
          </section>
        )}

        <button
          type="submit"
          className="w-full sm:w-auto bg-stone-800 dark:bg-stone-100 hover:bg-stone-900 dark:hover:bg-white text-white dark:text-stone-900 font-bold py-3 px-8 rounded-2xl shadow-sm transition-colors text-lg"
        >
          Salvar Tudo
        </button>
      </form>
      {isAdmin && <AdminWidget />}
    </main>
  );
}