import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RealtimeListener from "@/components/RealtimeListener";
import XpBadge from "@/components/XpBadge";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início",    emoji: "🏠" },
  { href: "/tarefas",   label: "Tarefas",   emoji: "📋" },
  { href: "/compras",   label: "Compras",   emoji: "🛒" },
  { href: "/financas",  label: "Finanças",  emoji: "💸" },
  { href: "/historico", label: "Histórico", emoji: "📜" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <RealtimeListener />
      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-warm-100/50 backdrop-blur-xl border-r border-warm-200 px-6 py-8 gap-8">
          <div className="px-2">
            <span className="font-display text-3xl font-bold text-brand-700 tracking-tight">inara</span>
            <p className="text-sm font-medium text-sage-600 mt-1">lar organizado ✨</p>
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-600 hover:bg-warm-200/50 hover:text-stone-900 font-bold transition-all"
              >
                <span className="text-xl">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-warm-200 px-2 flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-sage-200 flex items-center justify-center text-sage-700 font-bold shadow-sm">
              {profile?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-stone-800 truncate">
                {profile?.full_name || profile?.username}
              </span>
              <XpBadge profileId={user.id} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-white md:rounded-l-[2.5rem] md:shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-hidden">
          {children}
        </main>
      </div>
    </>
  );
}