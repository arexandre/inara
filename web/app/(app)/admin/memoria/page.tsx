import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemoryLogsClient from "./MemoryLogsClient";

export const metadata = { title: "Auditoria & Memória" };

export default async function MemoriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  // Fetch Knowledge Base
  const { data: knowledge } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch Logs
  const { data: logs } = await supabase
    .from("system_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch System Settings
  const { data: settings } = await supabase
    .from("system_settings")
    .select("system_prompt")
    .eq("id", 1)
    .single();

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto h-[calc(100dvh-2rem)] flex flex-col">
      <header className="space-y-2 shrink-0">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-3">
          <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 p-2 rounded-2xl">🧠</span>
          Cérebro da Inara
        </h1>
        <p className="text-stone-500 dark:text-stone-400 font-medium">Controle absoluto sobre a memória e auditoria do sistema.</p>
      </header>

      <div className="flex-1 min-h-0 bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden flex flex-col">
        <MemoryLogsClient initialKnowledge={knowledge || []} initialLogs={logs || []} initialSystemPrompt={settings?.system_prompt || ""} />
      </div>
    </main>
  );
}
