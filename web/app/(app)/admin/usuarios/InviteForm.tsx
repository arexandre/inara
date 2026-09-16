"use client";

import { useState } from "react";
import { inviteUser } from "@/app/actions";

export default function InviteForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);
    
    const result = await inviteUser(formData);
    
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Morador convidado com sucesso!" });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 p-6 md:p-8">
      <h2 className="font-display font-bold text-xl text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
        <span>➕</span> Convidar Novo Morador
      </h2>
      
      <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          name="full_name"
          placeholder="Nome completo"
          required
          className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
        />
        <input
          name="username"
          placeholder="@username"
          required
          className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
        />
        <input
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          required
          className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
        />
        <div className="md:col-span-3 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-stone-300 text-white font-bold px-6 py-3 rounded-2xl transition-all"
          >
            {loading ? "Criando..." : "Cadastrar Morador"}
          </button>
          {message && (
            <span className={`text-sm font-bold ${message.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
