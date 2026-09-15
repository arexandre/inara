import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimelineClient from "./TimelineClient";

export const metadata = { title: "Histórico e Logs" };

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch chat history with profile data
  const { data: logs } = await supabase
    .from("chat_history")
    .select("id, created_at, is_bot, message, profile:profiles(username, avatar_url)")
    .order("created_at", { ascending: true })
    .limit(200);

  // Cast para evitar problemas de tipagem com o join do PostgREST
  const formattedLogs = (logs || []).map(log => ({
    ...log,
    profile: Array.isArray(log.profile) ? log.profile[0] : log.profile
  })) as any[];

  return (
    <main className="p-6 md:p-10 space-y-8 h-full flex flex-col">
      <header className="space-y-2 shrink-0 max-w-4xl mx-auto w-full">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Linha do Tempo</h1>
        <p className="text-stone-500 font-medium">Conversas e acontecimentos recentes na casa.</p>
      </header>

      <section className="flex-1 min-h-0 w-full">
        <TimelineClient logs={formattedLogs} />
      </section>
    </main>
  );
}