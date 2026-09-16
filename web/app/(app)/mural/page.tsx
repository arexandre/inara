import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Mural" };

export default async function MuralPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mural } = await supabase
    .from("mural")
    .select("*, author:profiles!mural_created_by_fkey(username)")
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Mural de Avisos</h1>
        <p className="text-stone-500 font-medium">Recados fixados e anúncios importantes da casa.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mural?.map(item => (
          <div key={item.id} className="bg-amber-100 dark:bg-amber-900/40 p-6 rounded-3xl shadow-sm border-2 border-amber-200 dark:border-amber-800/50 transform rotate-1 hover:rotate-0 transition-transform">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📌</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-500">@{item.author?.username || "Inara"}</span>
            </div>
            <p className="text-amber-900 dark:text-amber-100 font-medium whitespace-pre-wrap">{item.message}</p>
            <div className="mt-4 text-xs font-bold text-amber-600/70 dark:text-amber-500/50">
              {new Date(item.created_at).toLocaleString("pt-BR")}
            </div>
          </div>
        ))}
        {(!mural || mural.length === 0) && (
          <div className="col-span-full py-20 text-center text-stone-400 font-bold border-2 border-dashed rounded-3xl border-stone-200 dark:border-stone-800">
            Nenhum aviso no mural.
          </div>
        )}
      </div>
    </main>
  );
}