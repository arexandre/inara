"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerRoutine as serverTriggerRoutine } from "@/app/actions";

type Tab = "routines" | "shortcuts" | "status";

export default function ConfigClient({ initialRoutines, initialShortcuts, initialHealth }: any) {
  const [activeTab, setActiveTab] = useState<Tab>("routines");
  const [routines, setRoutines] = useState(initialRoutines);
  const [shortcuts, setShortcuts] = useState(initialShortcuts);
  const supabase = createClient();
  const router = useRouter();

  // --- Rotinas ---
  const triggerRoutine = async (command: string) => {
    toast.info(`Disparando rotina: ${command}...`);
    const result = await serverTriggerRoutine(command);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Comando enviado para o Bot!");
    }
  };

  const createRoutine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const command = formData.get("command") as string;
    const schedule_cron = formData.get("schedule_cron") as string;

    const { data, error } = await supabase.from("custom_routines").insert({ name, command, schedule_cron }).select().single();
    if (error) { toast.error("Erro ao criar rotina"); return; }
    toast.success("Rotina criada!");
    setRoutines([data, ...routines]);
    e.currentTarget.reset();
  };

  const toggleRoutine = async (id: string, currentStatus: boolean) => {
    await supabase.from("custom_routines").update({ is_active: !currentStatus }).eq("id", id);
    setRoutines(routines.map((r: any) => r.id === id ? { ...r, is_active: !currentStatus } : r));
  };

  // --- Atalhos ---
  const createShortcut = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const command = formData.get("command") as string;
    const response_text = formData.get("response_text") as string;

    const { data, error } = await supabase.from("shortcuts").insert({ command, response_text }).select().single();
    if (error) { toast.error("Erro ao criar atalho (talvez já exista?)"); return; }
    toast.success("Atalho criado!");
    setShortcuts([...shortcuts, data].sort((a, b) => a.command.localeCompare(b.command)));
    e.currentTarget.reset();
  };

  const deleteShortcut = async (id: string) => {
    await supabase.from("shortcuts").delete().eq("id", id);
    setShortcuts(shortcuts.filter((s: any) => s.id !== id));
    toast.success("Atalho removido.");
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden min-h-[600px] flex flex-col">
      <div className="flex border-b border-warm-200 dark:border-stone-800 overflow-x-auto">
        <TabButton active={activeTab === "routines"} onClick={() => setActiveTab("routines")} icon="⚡" label="Rotinas & Gatilhos" />
        <TabButton active={activeTab === "shortcuts"} onClick={() => setActiveTab("shortcuts")} icon="🚀" label="Atalhos Rápidos" />
        <TabButton active={activeTab === "status"} onClick={() => setActiveTab("status")} icon="🩺" label="Status das APIs" />
      </div>

      <div className="p-6 md:p-8 flex-1 bg-warm-50/30 dark:bg-stone-950/30">
        {activeTab === "routines" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200 mb-4">Gatilhos Manuais</h3>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => triggerRoutine("ping_de_ociosidade")} className="bg-brand-100 hover:bg-brand-200 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 font-bold px-5 py-3 rounded-2xl shadow-sm transition-all border border-brand-200 dark:border-brand-800">🎯 Cobrar Tarefas</button>
                <button onClick={() => triggerRoutine("cobrar_pagamentos")} className="bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold px-5 py-3 rounded-2xl shadow-sm transition-all border border-amber-200 dark:border-amber-800">💸 Cobrar Pagamentos</button>
                <button onClick={() => triggerRoutine("boa_noite")} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold px-5 py-3 rounded-2xl shadow-sm transition-all border border-indigo-200 dark:border-indigo-800">🌙 Dar Boa Noite</button>
                <button onClick={() => triggerRoutine("finance_checkout")} className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold px-5 py-3 rounded-2xl shadow-sm transition-all border border-red-200 dark:border-red-800">⚖️ Fechar Mês (Acerto)</button>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200">Rotinas Agendadas (Cron)</h3>
              
              <div className="flex gap-4 items-end bg-brand-50/50 dark:bg-brand-900/10 p-5 rounded-2xl border border-brand-200 dark:border-brand-800 shadow-sm relative overflow-hidden">
                <div className="flex-1 space-y-2 z-10">
                  <h4 className="font-bold text-brand-800 dark:text-brand-300">Nova Rotina (Delegação à Síndica)</h4>
                  <p className="text-xs text-brand-600/80 dark:text-brand-400/80">Ex: "Me lembre de pagar o aluguel todo dia 5 às 10h". A Inara vai configurar o Cron e o sistema para você.</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem("nlp_command") as HTMLInputElement;
                    if (!input.value) return;
                    
                    const { error } = await supabase.from("pending_actions").insert({
                      intent: "chat",
                      payload: { reply: "Por favor, crie uma rotina para mim: " + input.value },
                      chat_id: 0,
                      status: "pending"
                    });
                    
                    if (error) toast.error("Erro ao enviar para Inara");
                    else toast.success("Pedido enviado! A Inara fará o setup em segundos.");
                    
                    input.value = "";
                  }} className="flex gap-3">
                    <input name="nlp_command" required placeholder="Digite sua rotina naturalmente..." className="flex-1 bg-white dark:bg-stone-950 border border-brand-200 dark:border-brand-700 rounded-xl px-4 py-2 text-sm focus:ring-2 outline-none shadow-sm" />
                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-sm">Pedir à IA ✨</button>
                  </form>
                </div>
              </div>

              <div className="grid gap-3">
                {routines.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
                    <div>
                      <h4 className="font-bold text-stone-800 dark:text-stone-200">{r.name}</h4>
                      <div className="flex gap-3 text-xs font-mono text-stone-500 mt-1">
                        <span className="bg-warm-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">{r.command}</span>
                        <span className="bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 px-2 py-0.5 rounded-md">{r.schedule_cron}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => triggerRoutine(r.command)} className="text-xs font-bold bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-2 rounded-xl transition-colors border border-brand-200">Disparar</button>
                      <button 
                        onClick={() => toggleRoutine(r.id, r.is_active)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors border ${r.is_active ? 'bg-sage-50 border-sage-200 text-sage-700' : 'bg-warm-100 border-warm-200 text-stone-500'}`}
                      >
                        {r.is_active ? 'Ativa' : 'Pausada'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "shortcuts" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200">Atalhos do Bot (Bypass)</h3>
            <p className="text-sm text-stone-500">Comandos que pulam a IA e respondem instantaneamente.</p>
            
            <form onSubmit={createShortcut} className="flex gap-4 items-end bg-white dark:bg-stone-900 p-4 rounded-2xl border border-warm-200 dark:border-stone-800 shadow-sm">
              <div className="w-1/3 space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Comando</label>
                <input name="command" required placeholder="Ex: !pix" className="w-full bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm focus:ring-2 outline-none font-mono" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Texto de Resposta</label>
                <input name="response_text" required placeholder="Chave: 119999..." className="w-full bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm focus:ring-2 outline-none" />
              </div>
              <button type="submit" className="bg-stone-800 hover:bg-stone-700 dark:bg-stone-200 dark:hover:bg-white text-white dark:text-stone-900 font-bold px-6 py-2 rounded-xl transition-all h-[38px]">Salvar</button>
            </form>

            <div className="grid gap-3 md:grid-cols-2">
              {shortcuts.map((s: any) => (
                <div key={s.id} className="bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm relative group">
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg text-sm border border-brand-200 dark:border-brand-800">{s.command}</span>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mt-3 line-clamp-3">{s.response_text}</p>
                  <button onClick={() => deleteShortcut(s.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "status" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-display font-bold text-xl text-stone-800 dark:text-stone-200">Integrações e APIs</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {initialHealth.map((h: any) => (
                <div key={h.id} className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-warm-200 dark:border-stone-800 shadow-sm flex flex-col items-center text-center gap-2">
                  <div className={`h-4 w-4 rounded-full ${h.status === 'ok' ? 'bg-sage-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}></div>
                  <h4 className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">{h.service_name}</h4>
                  <p className="text-xs text-stone-400 font-medium">Última checagem: {new Date(h.last_check).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              {initialHealth.length === 0 && (
                <div className="col-span-full p-10 text-center text-stone-500 border-2 border-dashed border-warm-200 dark:border-stone-800 rounded-3xl">Nenhum monitoramento ativo no momento.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
        active 
          ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-stone-900' 
          : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-warm-100/50 dark:hover:bg-stone-800/50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}
