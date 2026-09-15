import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task, TaskStatus } from "@/types/database";
import TaskCard from "./TaskCard";

export const metadata = { title: "Tarefas" };

const COLUMNS: { status: TaskStatus; label: string; emoji: string }[] = [
  { status: "backlog",     label: "Backlog",    emoji: "📦" },
  { status: "todo",        label: "A Fazer",    emoji: "🎯" },
  { status: "in_progress", label: "Fazendo",    emoji: "🚧" },
  { status: "done",        label: "Feito",      emoji: "✅" },
];

export default async function TarefasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks = [] } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(username)")
    .order("seq_id", { ascending: true });

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = (tasks ?? []).filter((t) => t.status === col.status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Tarefas</h1>
        <p className="text-stone-500 font-medium">Arraste para organizar (ou use o Telegram!).</p>
      </header>

      {/* Kanban */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 items-start">
        {COLUMNS.map((col) => (
          <section key={col.status} className="bg-warm-100/50 p-4 rounded-3xl space-y-4 border border-warm-200/60 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xl">{col.emoji}</span>
              <h2 className="font-display font-bold text-stone-700 text-lg tracking-tight">{col.label}</h2>
              <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-sage-600 shadow-sm">
                {grouped[col.status]?.length ?? 0}
              </span>
            </div>
            
            <div className="space-y-3">
              {(grouped[col.status] ?? []).map((task) => (
                <TaskCard key={task.id} task={task as any} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}