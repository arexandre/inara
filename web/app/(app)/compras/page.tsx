import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Lista de Compras" };

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("shopping_list")
    .select("*, added_by_profile:profiles!shopping_list_added_by_fkey(username)")
    .order("created_at", { ascending: false });

  const pending   = (items ?? []).filter((i) => i.status === "pending");
  const purchased = (items ?? []).filter((i) => i.status === "purchased");

  return (
    <main className="p-6 md:p-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-stone-800">Compras</h1>
        <a href="/compras/novo" className="btn-primary">+ Adicionar</a>
      </header>

      {/* Pendentes */}
      <section className="space-y-3">
        <h2 className="font-medium text-stone-600">🛒 A comprar ({pending.length})</h2>
        <div className="card divide-y divide-warm-200">
          {pending.length === 0 && (
            <p className="px-5 py-4 text-sm text-stone-400">
              Lista vazia — aproveite! 🎉
            </p>
          )}
          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">{item.item_name}</p>
                <p className="text-xs text-stone-400">
                  {item.quantity}
                  {item.category ? ` · ${item.category}` : ""}
                  {" · @"}{(item as any).added_by_profile?.username}
                </p>
              </div>
              {item.estimated_price && (
                <p className="text-sm text-stone-500 shrink-0">
                  ~{Number(item.estimated_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Comprados */}
      {purchased.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium text-stone-400">✓ Comprados ({purchased.length})</h2>
          <div className="card divide-y divide-warm-200 opacity-60">
            {purchased.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                <p className="text-sm line-through text-stone-500">{item.item_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
