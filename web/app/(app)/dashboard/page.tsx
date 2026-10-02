import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import MuralClient from "./MuralClient";
import MetricsCharts from "./MetricsCharts";

export const metadata = { title: "Início" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin")
    .eq("id", user.id)
    .single();

  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .neq("status", "done");

  const { count: shoppingCount } = await supabase
    .from("shopping_list")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: notes } = await supabase
    .from("mural_notes")
    .select("*, profiles(full_name, username)")
    .order("created_at", { ascending: false });

  // --- BI Data Fetching ---
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  
  // 1. Burn Rate
  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, transaction_date")
    .eq("type", "collective")
    .gte("transaction_date", firstDay)
    .order("transaction_date", { ascending: true });

  const burnRateMap: Record<string, number> = {};
  let cumulative = 0;
  if (txs) {
    txs.forEach(tx => {
      const day = new Date(tx.transaction_date).getDate().toString().padStart(2, '0');
      cumulative += Number(tx.amount);
      burnRateMap[day] = cumulative;
    });
  }
  const burnRateData = Object.entries(burnRateMap).map(([day, amount]) => ({ day, amount }));

  // 2. Hall of Fame
  const { data: doneTasks } = await supabase
    .from("tasks")
    .select("xp_reward, profiles!tasks_assignee_id_fkey(username)")
    .eq("status", "done")
    .not("assignee_id", "is", null);

  const hallMap: Record<string, number> = {};
  if (doneTasks) {
    doneTasks.forEach(t => {
      const name = (t.profiles as any)?.username || "Desconhecido";
      hallMap[name] = (hallMap[name] || 0) + (t.xp_reward || 10);
    });
  }
  const hallOfFameData = Object.entries(hallMap)
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp);

  return (
    <main className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 md:gap-0 pt-4 md:pt-0 pr-12 md:pr-0">
        <div className="space-y-1">
          <p className="text-sm text-stone-500 font-bold">Bom dia!</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight break-all md:break-normal">
            {profile?.full_name?.split(" ")[0] ?? "Morador"}
          </h1>
        </div>
        <Link href="/config" className="text-sm font-bold text-stone-600 dark:text-stone-400 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 px-5 py-2.5 rounded-xl transition-all shadow-sm hover:border-brand-200">
          ⚙️ Configurações
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Tarefas pendentes"
          value={taskCount ?? 0}
          href="/tarefas"
          accent="brand"
        />
        <SummaryCard
          label="Itens na lista"
          value={shoppingCount ?? 0}
          href="/compras"
          accent="sage"
        />
        <SummaryCard
          label="Livro-caixa"
          value="Ver saldo"
          href="/financas"
          accent="warm"
        />
      </div>
      
      {/* Gráficos BI */}
      <MetricsCharts burnRateData={burnRateData} hallOfFameData={hallOfFameData} />

      {/* Mural da Casa Integrado */}
      <MuralClient initialNotes={notes || []} isAdmin={profile?.is_admin || false} />
    </main>
  );
}

function SummaryCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  accent: "brand" | "sage" | "warm";
}) {
  const accentMap = {
    brand: "from-brand-50 to-brand-100/50 border-brand-200 hover:border-brand-400 dark:from-brand-900/20 dark:to-brand-900/10 dark:border-brand-900/50 dark:hover:border-brand-500/50",
    sage:  "from-sage-50 to-sage-100/50 border-sage-200 hover:border-sage-400 dark:from-sage-900/20 dark:to-sage-900/10 dark:border-sage-900/50 dark:hover:border-sage-500/50",
    warm:  "from-warm-50 to-warm-100/50 border-warm-200 hover:border-warm-400 dark:from-warm-900/20 dark:to-warm-900/10 dark:border-warm-900/50 dark:hover:border-warm-500/50",
  };

  return (
    <a
      href={href}
      className={`bg-gradient-to-br ${accentMap[accent]} border p-6 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 rounded-3xl`}
    >
      <p className="text-3xl font-display font-bold text-stone-800 dark:text-stone-200">{value}</p>
      <p className="text-sm font-bold text-stone-600 dark:text-stone-400">{label}</p>
    </a>
  );
}