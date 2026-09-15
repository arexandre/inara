import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Histórico de Chat" };

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca as ultimas mensagens
  const { data: messages, error } = await supabase
    .from("chat_history")
    .select("id, message, is_bot, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao carregar histórico:", error);
  }

  return (
    <main className="space-y-6 p-6 md:p-10 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold text-stone-800">
          Histórico de Conversas
        </h1>
        <p className="text-sm text-stone-500">
          Últimas interações com a Inara pelo Telegram.
        </p>
      </header>

      <div className="card p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto bg-stone-50">
        {!messages || messages.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-10">
            Nenhum histórico encontrado. Converse com a Inara no Telegram! (Você já rodou o SQL?)
          </p>
        ) : (
          [...messages].reverse().map((msg: any) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                msg.is_bot ? "self-start" : "self-end items-end"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-semibold text-stone-500">
                  {msg.is_bot ? "Inara" : `@${msg.profiles?.username || "Morador"}`}
                </span>
                <span className="text-[10px] text-stone-400">
                  {new Date(msg.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.is_bot
                    ? "bg-white border border-stone-200 text-stone-700 rounded-tl-sm"
                    : "bg-brand-500 text-white rounded-tr-sm"
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}