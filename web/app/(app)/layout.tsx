import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início",    emoji: "🏠" },
  { href: "/tarefas",   label: "Tarefas",   emoji: "✅" },
  { href: "/financas",  label: "Finanças",  emoji: "💸" },
  { href: "/compras",   label: "Compras",   emoji: "🛒" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, xp_total")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white/70 backdrop-blur-md
                        border-r border-warm-200 px-4 py-6 gap-6">
        {/* Logo */}
        <div className="px-2">
          <span className="font-display text-2xl font-semibold text-stone-800">inara</span>
          <p className="text-xs text-stone-400 mt-0.5">lar organizado ✨</p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium
                         text-stone-600 transition hover:bg-warm-100 hover:text-stone-900"
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Perfil */}
        <div className="flex items-center gap-3 rounded-2xl bg-warm-100 px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-brand-200 flex items-center justify-center
                          text-sm font-medium text-brand-700">
            {profile?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-700 truncate">
              @{profile?.username ?? "—"}
            </p>
            <p className="text-xs text-stone-400">{profile?.xp_total ?? 0} XP</p>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto">
        {/* Barra mobile */}
        <nav className="md:hidden flex items-center justify-around border-b border-warm-200
                        bg-white/80 backdrop-blur-sm px-4 py-2 sticky top-0 z-10">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-stone-900">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
