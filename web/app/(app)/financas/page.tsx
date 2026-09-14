import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Finanças" };

export default async function FinancasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: balances } = await supabase.from("balance_summary").select("*");
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, paid_by_profile:profiles!transactions_paid_by_fkey(username)")
    .order("transaction_date", { ascending: false })
    .limit(20);

  return (
    <main className="p-6 md:p-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-stone-800">Finanças</h1>
        <a href="/financas/novo" className="btn-primary">+ Lançar</a>
      </header>

      {/* Saldos por morador */}
      <section className="space-y-3">
        <h2 className="font-medium text-stone-600">Rateio atual</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(balances ?? []).map((b) => (
            <div key={b.id} className="card p-5 space-y-1">
              <p className="font-medium text-stone-700">@{b.username}</p>
              <p className="text-2xl font-semibold text-stone-800">
                {b.balance >= 0 ? "+" : ""}
                {Number(b.balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-xs text-stone-400">
                Pagou {Number(b.total_paid).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Lançamentos recentes */}
      <section className="space-y-3">
        <h2 className="font-medium text-stone-600">Lançamentos recentes</h2>
        <div className="card divide-y divide-warm-200">
          {(transactions ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-stone-800">{t.description}</p>
                <p className="text-xs text-stone-400">
                  {t.type === "collective" ? "Coletivo" : "Individual"} •{" "}
                  @{(t as any).paid_by_profile?.username}
                </p>
              </div>
              <p className="font-semibold text-stone-800">
                {Number(t.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
