import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConfigClient from "./ConfigClient";

export const metadata = { title: "Central de Comando" };

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  // Fetch data for the tabs
  const { data: routines } = await supabase.from("custom_routines").select("*").order("created_at", { ascending: false });
  const { data: shortcuts } = await supabase.from("shortcuts").select("*").order("command");
  const { data: systemHealth } = await supabase.from("system_health").select("*").order("last_check", { ascending: false });

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-3">
          <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 p-2 rounded-2xl">🛡️</span>
          Central de Comando
        </h1>
        <p className="text-stone-500 dark:text-stone-400 font-medium">Controle de automações, atalhos do bot e saúde do sistema.</p>
      </header>

      <ConfigClient 
        initialRoutines={routines || []} 
        initialShortcuts={shortcuts || []} 
        initialHealth={systemHealth || []} 
      />
    </main>
  );
}
