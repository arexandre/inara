"use client";

import { useState } from "react";

type Log = {
  id: string;
  created_at: string;
  is_bot: boolean;
  message: string;
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
};

export default function TimelineClient({ logs }: { logs: Log[] }) {
  const [filter, setFilter] = useState<"Tudo" | "Mensagens" | "Ações" | "Erros">("Tudo");

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    if (filter === "Tudo") return true;
    
    const isError = log.is_bot && (
      log.message.includes("⚠️") || 
      log.message.includes("🚨") || 
      log.message.includes("🥵") || 
      log.message.includes("🔌") || 
      log.message.includes("🤯")
    );
    
    const isAction = log.is_bot && !isError && (
      log.message.includes("✅") || 
      log.message.includes("🛒") || 
      log.message.includes("💸") || 
      log.message.includes("✨")
    );

    if (filter === "Erros") return isError;
    if (filter === "Ações") return isAction;
    if (filter === "Mensagens") return !isError && !isAction;
    
    return true;
  });

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {["Tudo", "Mensagens", "Ações", "Erros"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-5 py-2 rounded-2xl text-sm font-bold transition-all ${
              filter === f 
                ? "bg-brand-600 text-white shadow-md" 
                : "bg-white text-stone-500 border border-warm-200 hover:border-brand-300 hover:text-brand-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Timeline Feed */}
      <div className="flex-1 space-y-6 pb-20">
        {filteredLogs.map((log) => {
          const isError = log.is_bot && (
            log.message.includes("⚠️") || log.message.includes("🚨") || log.message.includes("🥵") || log.message.includes("🔌") || log.message.includes("🤯")
          );
          const isAction = log.is_bot && !isError && (
            log.message.includes("✅") || log.message.includes("🛒") || log.message.includes("💸") || log.message.includes("✨")
          );

          // ACTION BADGE RENDER
          if (isAction) {
            return (
              <div key={log.id} className="flex justify-center my-6">
                <div className="bg-sage-100/50 border border-sage-200 px-6 py-3 rounded-2xl text-sm font-bold text-sage-700 shadow-sm flex items-center gap-3">
                  <span className="text-xl">✨</span>
                  <span>{log.message.replace(/^[✅🛒💸✨]+/, "").trim()}</span>
                </div>
              </div>
            );
          }

          // ERROR BADGE RENDER
          if (isError) {
            return (
              <div key={log.id} className="flex justify-center my-6">
                <div className="bg-brand-50 border border-brand-200 px-6 py-4 rounded-3xl text-sm font-bold text-brand-700 shadow-sm max-w-md text-center">
                  {log.message}
                </div>
              </div>
            );
          }

          // NORMAL MESSAGE BUBBLES
          const isHuman = !log.is_bot;

          return (
            <div key={log.id} className={`flex w-full ${isHuman ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isHuman ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* Avatar */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                    ${isHuman ? "bg-warm-200 text-stone-700" : "bg-brand-500 text-white"}`}>
                    {isHuman ? (log.profile?.username?.[0]?.toUpperCase() || "?") : "🤖"}
                  </div>
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-bold text-stone-400 px-1 ${isHuman ? "text-right" : "text-left"}`}>
                    {isHuman ? `@${log.profile?.username || "morador"}` : "Inara"} • {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className={`px-5 py-4 rounded-3xl shadow-sm text-[15px] font-medium leading-relaxed
                    ${isHuman 
                      ? "bg-brand-600 text-white rounded-tr-sm" 
                      : "bg-white text-stone-700 border border-warm-200 rounded-tl-sm"
                    }`}>
                    {log.message}
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="py-20 text-center text-stone-400 font-bold">
            Nenhuma mensagem encontrada nesse filtro.
          </div>
        )}
      </div>
    </div>
  );
}