import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RealtimeListener from "@/components/RealtimeListener";
import { logout } from "@/app/actions";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Início",    emoji: "🏠" },
  { href: "/tarefas",    label: "Tarefas",   emoji: "📦" },
  { href: "/compras",    label: "Compras",   emoji: "🛒" },
  { href: "/financas",   label: "Finanças",  emoji: "💸" },
  { href: "/calendario", label: "Calendário",emoji: "📅" },
  { href: "/mural",      label: "Mural",     emoji: "📌" },
  { href: "/historico",  label: "Histórico", emoji: "📜" },
  { href: "/chat",       label: "Web Chat",  emoji: "💬" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <>
      <RealtimeListener />
      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-warm-100/50 backdrop-blur-xl border-r border-warm-200 px-6 py-8 gap-8 dark:bg-stone-900/50 dark:border-stone-800">
          <div className="px-2 flex flex-col">
            <span className="font-display text-3xl font-bold text-brand-700 dark:text-brand-400 tracking-tight">inara</span>
            <p className="text-sm font-medium text-sage-600 dark:text-sage-400 mt-1">lar organizado ✨</p>
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-warm-200/50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 font-bold transition-all"
              >
                <span className="text-xl">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-warm-200 dark:border-stone-800 space-y-2">
              <Link href="/perfil" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-warm-200/50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 font-bold transition-all">
                <span className="text-xl">⚙️</span>
                <span>Perfil & Config</span>
              </Link>
              {isAdmin && (
                <Link href="/admin/usuarios" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 font-bold transition-all">
                  <span className="text-xl">🛡️</span>
                  <span>Governança</span>
                </Link>
              )}
            </div>
          </nav>

          <div className="pt-6 border-t border-warm-200 dark:border-stone-800 flex flex-col gap-4">
            <div className="flex items-center gap-4 px-2">
              <div className="h-10 w-10 shrink-0 rounded-full bg-sage-200 dark:bg-sage-900 flex items-center justify-center text-sage-700 dark:text-sage-400 font-bold shadow-sm">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">
                  {profile?.full_name || profile?.username}
                </span>
                {isAdmin && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-[0_0_10px_rgba(251,191,36,0.5)] border border-amber-300">
                    O Arquiteto
                  </span>
                )}
              </div>
            </div>
            
            <form action={logout} className="px-2">
              <button type="submit" className="w-full py-2 px-4 rounded-xl text-sm font-bold text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-left flex gap-3">
                <span>🚪</span> Sair da Conta
              </button>
            </form>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-white dark:bg-stone-950 md:rounded-l-[2.5rem] md:shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-hidden">
          {children}
        </main>
      </div>
    </>
  );
}