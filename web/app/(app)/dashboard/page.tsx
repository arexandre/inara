import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, xp_total")
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

  return (
    <main className="space-y-8 p-6 md:p-10">
      <header className="space-y-1">
        <p className="text-sm text-stone-500">Bom dia!</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800">
          {profile?.full_name?.split(" ")[0] ?? "Morador"}
        </h1>
        <p className="text-sm text-stone-500">
          {profile?.xp_total ?? 0} XP acumulados
        </p>
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
    brand: "from-[#fef9f0] border-[#f9dba6] hover:border-[#ef9f35]",
    sage:  "from-[#f4f7f4] border-[#cbdbc9] hover:border-[#75a070]",
    warm:  "from-[#fdfaf7] border-[#e0caab] hover:border-[#cda97e]",
  };

  return (
    <a
      href={href}
      className={`card bg-gradient-to-br ${accentMap[accent]} border p-6 flex flex-col gap-3 transition hover:shadow-md hover:-translate-y-0.5`}
    >
      <p className="text-2xl font-semibold text-stone-800">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </a>
  );
}