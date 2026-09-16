import re

with open("web/app/(app)/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Add daily_journal query
old_query = """  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, xp_total")
    .eq("id", user.id)
    .single();"""

new_query = """  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, xp_total")
    .eq("id", user.id)
    .single();
    
  const { data: journal } = await supabase
    .from("daily_journal")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();"""

text = text.replace(old_query, new_query)

# Add Daily Journal section before active tasks
old_ui = """      <section>
        <h2 className="font-display font-bold text-2xl text-stone-800 dark:text-stone-100 mb-6">Suas Tarefas Ativas</h2>"""

new_ui = """      {journal && (
        <section className="bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 p-6 md:p-8 rounded-3xl border border-brand-100 dark:border-brand-800/30 shadow-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 text-9xl opacity-5">🗞️</div>
          <h2 className="font-display font-bold text-2xl text-brand-900 dark:text-brand-100 mb-4 flex items-center gap-2">
            <span>📰</span> Jornal da Casa (Resumo Matinal)
          </h2>
          <p className="text-brand-800 dark:text-brand-200 font-medium whitespace-pre-wrap leading-relaxed">{journal.content}</p>
          <div className="mt-4 text-xs font-bold text-brand-600/50 dark:text-brand-400/50 uppercase tracking-widest">
            Edição de {new Date(journal.created_at).toLocaleDateString("pt-BR")}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display font-bold text-2xl text-stone-800 dark:text-stone-100 mb-6">Suas Tarefas Ativas</h2>"""

text = text.replace(old_ui, new_ui)

with open("web/app/(app)/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("dashboard patched")