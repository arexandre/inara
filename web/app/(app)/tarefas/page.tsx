import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task, TaskStatus } from "@/types/database";

export const metadata = { title: "Tarefas" };

const COLUMNS: { status: TaskStatus; label: string; emoji: string }[] = [
  { status: "backlog",     label: "Backlog",    emoji: "📋" },
  { status: "todo",        label: "A Fazer",    emoji: "📌" },
  { status: "in_progress", label: "Em Andamento", emoji: "⚡" },
  { status: "done",        label: "Feito",      emoji: "✅" },
];

export default async function TarefasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks = [] } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(username, avatar_url)")
    .order("seq_id", { ascending: true });

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = (tasks ?? []).filter((t) => t.status === col.status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <main className="p-6 md:p-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-stone-800">Tarefas</h1>
        <a href="/tarefas/nova" className="btn-primary">+ Nova tarefa</a>
      </header>

      {/* Kanban */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <section key={col.status} className="space-y-3">
            <div className="flex items-center gap-2">
              <span>{col.emoji}</span>
              <h2 className="font-medium text-stone-700">{col.label}</h2>
              <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                {grouped[col.status]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              {(grouped[col.status] ?? []).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function TaskCard({ task }: { task: Task & { assignee?: { username: string; avatar_url: string | null } | null } }) {
  const code = `#${String(task.seq_id).padStart(4, "0")}`;

  return (
    <article className="card p-4 space-y-2 hover:shadow-md transition cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-stone-400">{code}</span>
        <span className="text-xs text-stone-400">{task.xp_reward} XP</span>
      </div>
      <p className="text-sm font-medium text-stone-800 leading-snug">{task.title}</p>
      {task.assignee && (
        <p className="text-xs text-stone-500">@{task.assignee.username}</p>
      )}
    </article>
  );
}
