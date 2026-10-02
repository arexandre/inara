import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionsClient from "./TransactionsClient";

export const metadata = { title: "Finanças" };

export default async function FinancasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch balances
  const { data: balances } = await supabase.from("balance_summary").select("*");
  
  // Fetch transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, payer:profiles!transactions_paid_by_fkey(username)")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Finanças da Casa</h1>
        <p className="text-stone-500 dark:text-stone-400 font-medium">Acerto de contas e rateio de despesas.</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {balances?.map((b) => (
          <div key={b.id} className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 flex flex-col gap-2 transition-all hover:-translate-y-0.5">
            <h3 className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-sm">@{b.username}</h3>
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold text-stone-800 dark:text-stone-200">
                R$ {Math.abs(Number(b.balance)).toFixed(2)}
              </span>
            </div>
            <p className={`text-sm font-bold ${Number(b.balance) >= 0 ? "text-sage-600 dark:text-sage-500" : "text-brand-600 dark:text-brand-500"}`}>
              {Number(b.balance) >= 0 ? "A receber no acerto" : "A pagar no acerto"}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-200 tracking-tight">Extrato Recente</h2>
        </header>
        <TransactionsClient initialTransactions={transactions || []} />
      </section>
    </main>
  );
}