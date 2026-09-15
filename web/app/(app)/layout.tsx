import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Fraunces, Quicksand } from "next/font/google";
import "./globals.css";
import RealtimeListener from "@/components/RealtimeListener";
import XpBadge from "@/components/XpBadge";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início",    emoji: "🏠" },
  { href: "/tarefas",   label: "Tarefas",   emoji: "✅" },
  { href: "/financas",  label: "Finanças",  emoji: "💸" },
  { href: "/compras",   label: "Compras",   emoji: "🛒" },
  { href: "/historico", label: "Histórico", emoji: "💬" },
  { href: "/admin",     label: "Uso de API",emoji: "📊" },
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
    <html lang="pt-BR" className={`${fraunces.variable} ${quicksand.variable}`}>
      <body className="font-sans bg-warm-50 text-stone-800 antialiased selection:bg-brand-200">
        <RealtimeListener />
        <div className="flex min-h-dvh">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-64 shrink-0 bg-warm-100/50 backdrop-blur-xl border-r border-warm-200 px-6 py-8 gap-8">
            <div className="px-2">
              <span className="font-display text-3xl font-bold text-brand-700 tracking-tight">inara</span>
              <p className="text-sm font-medium text-sage-600 mt-1">lar organizado ✨</p>
            </div>

            <nav className="flex-1 space-y-2 mt-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 rounded-3xl px-4 py-3 text-sm font-bold
                             text-stone-600 transition-all hover:bg-white hover:text-brand-600 shadow-sm hover:shadow"
                >
                  <span className="text-xl">{item.emoji}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm border border-warm-100">
              <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center
                              text-base font-bold text-brand-700">
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-700 truncate">
                  @{profile?.username ?? "morador"}
                </p>
                <XpBadge initialXp={profile?.xp_total ?? 0} />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}