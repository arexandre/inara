import re

with open("web/app/(app)/tarefas/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace TaskCard import
text = text.replace('import TaskCard from "./TaskCard";', 'import TasksBoard from "./TasksBoard";')

# Add is_archived: false filter to the query
old_query = """  const { data: tasks = [] } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(username)")
    .order("seq_id", { ascending: true });"""

new_query = """  const { data: tasks = [] } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(username)")
    .eq("is_archived", false)
    .order("seq_id", { ascending: true });"""

text = text.replace(old_query, new_query)

# Replace the inner return block
old_return = """  return (
    <main className="p-6 md:p-10 space-y-8 h-[calc(100dvh-2rem)] flex flex-col max-w-[1600px] mx-auto">
      <header className="shrink-0">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Quadro de Tarefas</h1>
        <p className="text-stone-500 font-medium">Arraste para organizar (ou use o Telegram!)</p>
      </header>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
        {COLUMNS.map((col) => (
          <section key={col.status} className="snap-center min-w-[320px] max-w-[320px] flex flex-col bg-warm-100/50 dark:bg-stone-900/50 rounded-3xl border border-warm-200/50 dark:border-stone-800/50 p-4 shrink-0">
            <header className="flex items-center gap-3 mb-6 px-2">
              <span className="text-xl bg-white dark:bg-stone-800 p-2 rounded-xl shadow-sm border border-warm-100 dark:border-stone-700">{col.emoji}</span>
              <h2 className="font-display font-bold text-lg text-stone-800 dark:text-stone-200 tracking-wide">{col.label}</h2>
              <div className="ml-auto bg-warm-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold px-2 py-1 rounded-full">
                {grouped[col.status].length}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar px-1">
              {grouped[col.status].map((task) => (
                <TaskCard key={task.id} task={task} currentAssigneeId={user.id} />
              ))}
              
              {grouped[col.status].length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-warm-200 dark:border-stone-800 rounded-2xl text-stone-400 font-medium text-sm">
                  Vazio
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );"""

new_return = """  return (
    <main className="p-6 md:p-10 space-y-8 h-[calc(100dvh-2rem)] flex flex-col max-w-[1600px] mx-auto">
      <header className="shrink-0">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Quadro de Tarefas</h1>
        <p className="text-stone-500 font-medium">Selecione v\u00e1rias tarefas para a\u00e7\u00f5es em lote (ou use o Telegram!)</p>
      </header>
      <TasksBoard grouped={grouped} columns={COLUMNS} />
    </main>
  );"""

text = text.replace(old_return, new_return)

with open("web/app/(app)/tarefas/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("tarefas page patched!")