"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error("UI Error caught by boundary:", error);
    
    // Tentativa silenciosa de salvar no system_logs
    try {
      const supabase = createClient();
      supabase.from("system_logs").insert({
        level: "error",
        source: "next_ui",
        message: `Frontend crash: ${error.message || 'Unknown'}`
      }).then();
    } catch(e) {}

  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-4">
      <div className="bg-red-100 dark:bg-red-900/30 text-red-500 p-4 rounded-full">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-bold text-stone-800 dark:text-stone-200">Ops! Curto-circuito visual.</h2>
      <p className="text-sm text-stone-500 max-w-md">
        Um módulo da interface falhou ao carregar. A Inara já registrou este erro no painel de auditoria.
      </p>
      <button 
        onClick={() => reset()}
        className="mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2 rounded-xl transition-colors shadow-sm"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
