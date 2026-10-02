import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { purchaseShoppingItem } from "@/app/actions";
import ShoppingListClient from "./ShoppingListClient";

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

      <ShoppingListClient initialItems={items || []} />
    </main>
  );
}