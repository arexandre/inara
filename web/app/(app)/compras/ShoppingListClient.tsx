"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { purchaseShoppingItem } from "@/app/actions";
import { useRouter } from "next/navigation";

import type { ShoppingItem } from "@/types/database";

type Props = {
  initialItems: ShoppingItem[];
};

export default function ShoppingListClient({ initialItems }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel('realtime_shopping')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [payload.new as ShoppingItem, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const pendingItems = items.filter(i => i.status === "pending").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const purchasedItems = items.filter(i => i.status === "purchased").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group pending items by category
  const categories = pendingItems.reduce((acc, item) => {
    const cat = item.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <>
      <section className="space-y-6">
        <header className="flex items-center gap-3">
          <h2 className="font-display text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-2">
            🛒 Compras Pendentes
          </h2>
          <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-bold text-sm py-1 px-3 rounded-full">
            {pendingItems.length} itens
          </span>
        </header>
        
        {pendingItems.length === 0 ? (
          <div className="bg-gradient-to-br from-brand-50 to-sage-50 dark:from-brand-900/10 dark:to-sage-900/10 border border-brand-100 dark:border-stone-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
            <span className="text-5xl">✨</span>
            <div>
              <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200">Tudo Abastecido!</h3>
              <p className="text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">Nenhum item pendente na lista de compras. Pode relaxar, a despensa está em ordem.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(categories).map(([category, catItems]) => (
              <div key={category} className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden flex flex-col">
                <div className="bg-warm-50/50 dark:bg-stone-800/50 border-b border-warm-200 dark:border-stone-800 px-5 py-3 flex justify-between items-center">
                  <h3 className="font-display font-bold text-lg text-stone-700 dark:text-stone-300 capitalize">{category}</h3>
                  <span className="text-xs font-bold text-stone-500">{catItems.length} unid.</span>
                </div>
                <ul className="divide-y divide-warm-100 dark:divide-stone-800 flex-1">
                  {catItems.map((item) => (
                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-warm-50/30 dark:hover:bg-stone-800/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold shadow-sm border border-brand-100 dark:border-brand-800">
                          {item.quantity ?? 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-800 dark:text-stone-200 leading-tight">{item.item_name}</span>
                          {item.deadline_date && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
                              ⏳ Até {new Date(item.deadline_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          await purchaseShoppingItem(item.id);
                          router.refresh();
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 bg-white dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-brand-600 hover:border-brand-200 dark:hover:text-brand-400 dark:hover:border-brand-700 shadow-sm p-2 rounded-xl text-xs font-bold transition-all shrink-0"
                        title="Marcar como Comprado"
                      >
                        ✅
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {purchasedItems.length > 0 && (
        <section className="space-y-4 pt-6 mt-8 border-t border-warm-200 dark:border-stone-800">
          <h2 className="font-display text-xl font-bold text-stone-400 dark:text-stone-500 tracking-tight">
            Comprados Recentemente
          </h2>
          
          <div className="bg-stone-50 dark:bg-stone-900/30 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <ul className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
              {purchasedItems.slice(0, 10).map((item) => (
                <li key={item.id} className="p-4 flex items-center justify-between opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-500 font-bold text-sm">
                      {item.quantity ?? 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-600 dark:text-stone-400 line-through decoration-stone-400 dark:decoration-stone-600 decoration-2">{item.item_name}</h3>
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
    </>
  );
}
