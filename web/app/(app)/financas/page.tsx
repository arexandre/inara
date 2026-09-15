import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { payTransaction } from "@/app/actions";

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
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Finanças da Casa</h1>
        <p className="text-stone-500 font-medium">Acerto de contas e rateio de despesas.</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {balances?.map((b) => (
          <div key={b.id} className="bg-white p-6 rounded-3xl shadow-sm border border-warm-200 flex flex-col gap-2">
            <h3 className="font-bold text-stone-500 uppercase tracking-wider text-sm">@{b.username}</h3>
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold text-stone-800">
                R$ {Math.abs(Number(b.balance)).toFixed(2)}
              </span>
            </div>
            <p className={`text-sm font-bold ${Number(b.balance) >= 0 ? "text-sage-600" : "text-brand-600"}`}>
              {Number(b.balance) >= 0 ? "A receber no acerto" : "A pagar no acerto"}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-stone-800 tracking-tight">Últimos Gastos</h2>
        <div className="bg-white rounded-3xl shadow-sm border border-warm-200 overflow-hidden">
          <ul className="divide-y divide-warm-100">
            {transactions?.map((tx) => (
              <li key={tx.id} className="p-5 flex items-center justify-between hover:bg-warm-50 transition-colors group">
                <div>
                  <h4 className="font-bold text-stone-800 text-lg">{tx.description}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-sage-600">@{(tx as any).payer?.username}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-500 font-medium">{new Date(tx.transaction_date).toLocaleDateString("pt-BR")}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-brand-600 font-bold uppercase">{tx.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-display font-bold text-2xl text-stone-800">
                    R$ {Number(tx.amount).toFixed(2)}
                  </span>
                  <form action={async () => {
                    "use server";
                    await payTransaction(tx.id);
                  }}>
                    <button type="submit" className="opacity-0 group-hover:opacity-100 text-xs font-bold text-stone-400 hover:text-brand-600 bg-white border border-warm-200 hover:border-brand-200 px-3 py-2 rounded-xl transition-all shadow-sm">
                      Deletar/Quitar
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {(!transactions || transactions.length === 0) && (
              <li className="p-10 text-center text-stone-500 font-medium">Nenhum gasto registrado.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}