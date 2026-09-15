import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateSystemSettings } from "@/app/actions";

export const metadata = { title: "Configurações" };

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("system_settings")
    .select("idle_time_min")
    .eq("id", 1)
    .single();

  const currentIdleTime = settings?.idle_time_min ?? 120;

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-2xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Configurações do Sistema</h1>
        <p className="text-stone-500 font-medium">Parâmetros globais da casa e da Inara.</p>
      </header>

      <section className="bg-white p-6 rounded-3xl shadow-sm border border-warm-200">
        <form action={updateSystemSettings} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="idle_time_min" className="block text-sm font-bold text-stone-700">
              Tempo de Ociosidade da Inara (Minutos)
            </label>
            <p className="text-sm text-stone-500">
              Define quanto tempo a casa precisa ficar em silêncio para a Inara tomar a iniciativa e enviar uma mensagem puxando assunto ou dando avisos.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                name="idle_time_min"
                id="idle_time_min"
                defaultValue={currentIdleTime}
                min={15}
                max={1440}
                className="w-32 bg-warm-50 border border-warm-200 text-stone-800 text-lg font-bold rounded-xl px-4 py-2 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
              <span className="text-stone-500 font-medium">minutos</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-2xl shadow-sm transition-colors"
          >
            Salvar Configurações
          </button>
        </form>
      </section>
    </main>
  );
}
