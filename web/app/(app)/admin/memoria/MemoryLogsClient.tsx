"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Tab = "knowledge" | "logs";

import type { KnowledgeBaseDoc } from '@/types/database';

interface SystemLog { id: string; level: string; source: string; message: string; created_at: string; }

export default function MemoryLogsClient({ initialKnowledge, initialLogs, initialSystemPrompt }: { initialKnowledge: KnowledgeBaseDoc[], initialLogs: SystemLog[], initialSystemPrompt: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("knowledge");
  const [knowledge, setKnowledge] = useState(initialKnowledge);
  const [logs] = useState(initialLogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const topic = formData.get("topic") as string;

    if (editingId) {
      const { error } = await supabase.from("knowledge_base").update({ title, content, topic }).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      setKnowledge(knowledge.map((k: KnowledgeBaseDoc) => k.id === editingId ? { ...k, title, content, topic } : k));
      toast.success("Memória atualizada!");
    } else {
      const { data, error } = await supabase.from("knowledge_base").insert({ title, content, topic, source_type: "manual" }).select().single();
      if (error) { toast.error("Erro ao criar"); return; }
      setKnowledge([data, ...knowledge]);
      toast.success("Memória injetada!");
    }
    setEditingId(null);
    e.currentTarget.reset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar essa regra da IA?")) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (!error) setKnowledge(knowledge.filter((k: KnowledgeBaseDoc) => k.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-warm-200 dark:border-stone-800 shrink-0">
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'knowledge' ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-warm-50/50 dark:bg-stone-800/30' : 'border-transparent text-stone-500'}`}
        >
          <span>🧠</span> Base de Conhecimento
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'logs' ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-warm-50/50 dark:bg-stone-800/30' : 'border-transparent text-stone-500'}`}
        >
          <span>📜</span> System Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-warm-50/30 dark:bg-stone-950/30">
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 p-5 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-bold text-brand-800 dark:text-brand-300">Prompt Vivo (System Prompt)</h3>
              <p className="text-xs text-brand-600 dark:text-brand-400">Edite a personalidade central e diretrizes mestras da Inara.</p>
              <textarea 
                defaultValue={initialSystemPrompt}
                onBlur={async (e) => {
                  const val = e.target.value;
                  const { error } = await supabase.from("system_settings").update({ system_prompt: val }).eq("id", 1);
                  if (error) toast.error("Erro ao salvar Prompt Vivo");
                  else toast.success("Prompt Vivo atualizado!");
                }}
                className="w-full bg-white dark:bg-stone-950 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none resize-none font-mono text-stone-600 dark:text-stone-300"
                rows={6}
              />
            </div>

            <form onSubmit={handleSave} className="bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-stone-800 dark:text-stone-200">
                {editingId ? "Editar Contexto" : "Injetar Novo Contexto na IA"}
              </h3>
              <div className="flex gap-4">
                <input name="title" required placeholder="Título (ex: Regra da Lavanderia)" defaultValue={editingId ? knowledge.find((k: KnowledgeBaseDoc)=>k.id===editingId)?.title : ""} className="flex-1 bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-700 rounded-xl px-4 py-2 text-sm focus:ring-2 outline-none" />
                <input name="topic" required placeholder="Tópico (ex: Limpeza)" defaultValue={editingId ? knowledge.find((k: KnowledgeBaseDoc)=>k.id===editingId)?.topic : ""} className="w-1/3 bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-700 rounded-xl px-4 py-2 text-sm focus:ring-2 outline-none" />
              </div>
              <textarea name="content" required placeholder="Conteúdo exato que a Inara deve aprender e respeitar..." rows={4} defaultValue={editingId ? knowledge.find((k: KnowledgeBaseDoc)=>k.id===editingId)?.content : ""} className="w-full bg-warm-50 dark:bg-stone-950 border border-warm-200 dark:border-stone-700 rounded-xl px-4 py-2 text-sm focus:ring-2 outline-none resize-none" />
              <div className="flex justify-end gap-3">
                {editingId && <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500">Cancelar</button>}
                <button type="submit" className="bg-stone-800 hover:bg-stone-700 dark:bg-stone-200 dark:hover:bg-white text-white dark:text-stone-900 font-bold px-6 py-2 rounded-xl transition-all">{editingId ? "Salvar Alterações" : "Salvar no Cérebro"}</button>
              </div>
            </form>

            <div className="grid gap-4">
              {knowledge.map((k: KnowledgeBaseDoc) => (
                <div key={k.id} className="bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm relative group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-stone-800 dark:text-stone-200">{k.title}</h4>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-md">{k.topic}</span>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">{k.content}</p>
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => setEditingId(k.id)} className="text-stone-400 hover:text-brand-600">✏️</button>
                    <button onClick={() => handleDelete(k.id)} className="text-stone-400 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-warm-50 dark:bg-stone-950 text-stone-500 uppercase tracking-wider font-bold">
                  <th className="p-4">Nível</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Origem</th>
                  <th className="p-4">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 dark:divide-stone-800">
                {logs.map((log: SystemLog) => (
                  <tr key={log.id} className="hover:bg-warm-50/50 dark:hover:bg-stone-800/30">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${
                        log.level === 'error' || log.level === 'critical' ? 'bg-red-100 text-red-700' : 
                        log.level === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-sage-100 text-sage-700'
                      }`}>{log.level.toUpperCase()}</span>
                    </td>
                    <td className="p-4 text-stone-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="p-4 font-mono text-stone-600 dark:text-stone-400">{log.source}</td>
                    <td className="p-4 text-stone-800 dark:text-stone-200">{log.message}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-stone-400 font-bold">Nenhum log registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
