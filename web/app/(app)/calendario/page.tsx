import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export const metadata = { title: "Calendário" };

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch tasks with due_dates
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, assignee:profiles!tasks_assignee_id_fkey(username)")
    .not("due_date", "is", null);

  // Fetch events
  const { data: events } = await supabase
    .from("events")
    .select("*");

  return (
    <main className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto h-[calc(100dvh-2rem)] flex flex-col">
      <header className="flex items-center justify-between shrink-0 px-2">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Calendário</h1>
          <p className="text-stone-500 font-medium text-sm">Sincronia de Casa, Eventos e Feriados.</p>
        </div>
        <a 
          href="/api/calendar/feed.ics" 
          target="_blank"
          className="bg-warm-100 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          title="Assinar no Google Calendar / Apple Calendar"
        >
          📅 Assinar (.ICS)
        </a>
      </header>

      <div className="flex-1 bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden flex flex-col min-h-0">
        <CalendarClient initialTasks={tasks || []} initialEvents={events || []} />
      </div>
    </main>
  );
}