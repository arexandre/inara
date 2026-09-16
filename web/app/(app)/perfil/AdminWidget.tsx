"use client";
import { useState } from "react";

export default function AdminWidget() {
  const [loading, setLoading] = useState<string | null>(null);
  
  const trigger = async (command: string) => {
    setLoading(command);
    await fetch("/api/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
    setTimeout(() => setLoading(null), 1000);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 md:p-8 shadow-sm border border-brand-200 dark:border-brand-900/50 relative overflow-hidden mt-8">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-amber-400"></div>
      <h2 className="text-xl font-display font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
        <span>⚙️</span> Painel de Controle Remoto
      </h2>
      <div className="flex items-center gap-2 mb-6">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Motor AI: Online</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => trigger("force_bom_dia")}
          disabled={loading !== null}
          className="flex-1 bg-warm-50 dark:bg-stone-800 hover:bg-warm-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-warm-200 dark:border-stone-700 p-4 rounded-2xl font-bold transition-all disabled:opacity-50"
        >
          {loading === "force_bom_dia" ? "Disparando..." : "🌤️ Forçar Resumo Matinal"}
        </button>
        <button 
          onClick={() => trigger("force_ping")}
          disabled={loading !== null}
          className="flex-1 bg-warm-50 dark:bg-stone-800 hover:bg-warm-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-warm-200 dark:border-stone-700 p-4 rounded-2xl font-bold transition-all disabled:opacity-50"
        >
          {loading === "force_ping" ? "Disparando..." : "💬 Forçar Ping de Ociosidade"}
        </button>
      </div>
    </div>
  );
}