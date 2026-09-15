import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { purchaseShoppingItem } from "@/app/actions";

export const metadata = { title: "Compras" };

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 tracking-tight">Lista de Compras</h1>
        <p className="text-stone-500 font-medium">O que falta na despensa da casa.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-warm-200 overflow-hidden">
        {(!items || items.length === 0) ? (
          <div className="p-10 text-center text-stone-500 font-medium">Nenhum item pendente. Tudo abastecido!</div>
        ) : (
          <ul className="divide-y divide-warm-100">
            {items.map((item) => (
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
    </main>
  );
}