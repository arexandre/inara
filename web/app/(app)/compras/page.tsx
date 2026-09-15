import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { purchaseShoppingItem } from "@/app/actions";

export const metadata = { title: "Compras" };

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch pending and recent purchased items
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: items } = await supabase
    .from("shopping_list")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const pendingItems = items?.filter(i => i.status === "pending") || [];
  const purchasedItems = items?.filter(i => i.status === "purchased") || [];

  return (
    <main className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Lista de Compras</h1>
        <p className="text-stone-500 font-medium">O que falta na despensa da casa.</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-stone-700 tracking-tight flex items-center gap-2">
          🛒 Pendentes <span className="bg-brand-100 text-brand-700 text-sm py-1 px-3 rounded-full">{pendingItems.length}</span>
        </h2>
        
        <div className="bg-white rounded-3xl shadow-sm border border-warm-200 overflow-hidden">
          {pendingItems.length === 0 ? (
            <div className="p-10 text-center text-stone-500 font-medium">Nenhum item pendente. Tudo abastecido!</div>
          ) : (
            <ul className="divide-y divide-warm-100">
              {pendingItems.map((item) => (
                <li key={item.id} className="p-5 flex items-center justify-between hover:bg-warm-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                      {item.quantity ?? 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-lg">{item.item_name}</h3>
                      <p className="text-sm font-bold text-sage-600 uppercase tracking-wider">{item.category ?? "Geral"}</p>
                    </div>
                  </div>
                  <form action={async () => {
                    "use server";
                    await purchaseShoppingItem(item.id);
                  }}>
                    <button type="submit" className="opacity-0 group-hover:opacity-100 bg-white border border-warm-200 text-stone-500 hover:text-brand-600 hover:border-brand-200 shadow-sm px-4 py-2 rounded-2xl text-sm font-bold transition-all">
                      Marcar Comprado
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {purchasedItems.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-stone-400 tracking-tight">
            Comprados Recentemente
          </h2>
          
          <div className="bg-stone-50 rounded-3xl border border-stone-200 overflow-hidden">
            <ul className="divide-y divide-stone-200/60">
              {purchasedItems.map((item) => (
                <li key={item.id} className="p-4 flex items-center justify-between opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-sm">
                      {item.quantity ?? 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-600 line-through decoration-stone-400 decoration-2">{item.item_name}</h3>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{item.category ?? "Geral"}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-stone-400">
                    {new Date(item.updated_at || item.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}