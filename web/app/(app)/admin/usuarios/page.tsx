import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Governança" };

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Gestão de Usuários</h1>
        <p className="text-stone-500 font-medium">Controle de acesso e integração com Telegram.</p>
      </header>

      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden">
        <div className="p-6 border-b border-warm-100 dark:border-stone-800 flex justify-between items-center">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 text-lg">Moradores Cadastrados</h2>
          <span className="text-sm font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
            Bloqueio de Registro: ATIVO
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-warm-50/50 dark:bg-stone-950/50 text-stone-500 text-sm font-bold border-b border-warm-100 dark:border-stone-800">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Telegram ID</th>
                <th className="px-6 py-4">Admin?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 dark:divide-stone-800">
              {profiles?.map(p => (
                <tr key={p.id} className="hover:bg-warm-50 dark:hover:bg-stone-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-stone-800 dark:text-stone-200">{p.full_name || p.username}</div>
                    <div className="text-xs text-stone-400">@{p.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    {p.telegram_id ? (
                      <span className="text-sage-600 font-bold bg-sage-50 dark:bg-sage-900/30 px-3 py-1 rounded-lg">
                        {p.telegram_id}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-medium">Não vinculado</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.is_admin ? "⭐ Sim" : "Não"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-warm-50 dark:bg-stone-950 text-sm text-stone-500">
          Nota: Edições via Admin Panel serão implementadas futuramente. O bloqueio de novos registros no Supabase já está ativo na camada de Auth.
        </div>
      </div>
    </main>
  );
}