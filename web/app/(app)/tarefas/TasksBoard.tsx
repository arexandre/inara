"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import TaskCard from "./TaskCard";
import type { Task, TaskStatus } from "@/types/database";
import { useRouter } from "next/navigation";

type Props = {
  initialTasks: Task[];
  columns: { status: TaskStatus; label: string; emoji: string }[];
};

export default function TasksBoard({ initialTasks, columns }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel('realtime_tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Need to fetch assignee info potentially, but for now just add it
            // Ideally we just tell the router to refresh to get relational data
            router.refresh(); 
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const grouped = columns.reduce((acc, col) => {
    acc[col.status] = tasks.filter((t) => t.status === col.status && !t.is_archived);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const toggleSelect = (seq_id: number) => {
    setSelectedTasks(prev => 
      prev.includes(seq_id) ? prev.filter(id => id !== seq_id) : [...prev, seq_id]
    );
  };

  const handleBatchAction = async (action: "done" | "delete" | "archive") => {
    if (selectedTasks.length === 0) return;
    
    // Server action logic could be passed, but we'll use a direct fetch to an API, 
    // or just hit the Supabase JS client directly for simplicity in this MVP.
    const response = await fetch("/api/tasks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seq_ids: selectedTasks, action })
    });
    
    if (response.ok) {
      setSelectedTasks([]);
      // Realtime will update the UI automatically or we can rely on router.refresh()
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x relative min-h-[500px]">
      {columns.map((col) => (
        <section key={col.status} className="snap-center min-w-[320px] max-w-[320px] flex flex-col bg-warm-100/50 dark:bg-stone-900/50 rounded-3xl border border-warm-200/50 dark:border-stone-800/50 p-4 shrink-0">
          <header className="flex items-center gap-3 mb-6 px-2">
            <span className="text-xl bg-white dark:bg-stone-800 p-2 rounded-xl shadow-sm border border-warm-100 dark:border-stone-700">{col.emoji}</span>
            <h2 className="font-display font-bold text-lg text-stone-800 dark:text-stone-200 tracking-wide">{col.label}</h2>
            <div className="ml-auto bg-warm-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold px-2 py-1 rounded-full">
              {grouped[col.status].length}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar px-1">
            {grouped[col.status].map((task) => {
              const isSelected = selectedTasks.includes(task.seq_id);
              return (
                <div 
                  key={task.id} 
                  onClick={() => toggleSelect(task.seq_id)}
                  className={`cursor-pointer rounded-2xl transition-all duration-200 ${isSelected ? 'ring-2 ring-brand-500 scale-[1.02] bg-brand-50/10 shadow-md' : 'hover:scale-[1.01]'}`}
                >
                  <TaskCard task={task} />
                </div>
              );
            })}
            
            {grouped[col.status].length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-warm-200 dark:border-stone-800 rounded-2xl text-stone-400 font-medium text-sm">
                Vazio
              </div>
            )}
          </div>
        </section>
      ))}

      {selectedTasks.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-stone-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 border border-stone-700">
          <span className="font-bold">{selectedTasks.length} selecionadas</span>
          <div className="h-6 w-px bg-stone-700"></div>
          <button onClick={() => handleBatchAction("done")} className="hover:text-brand-400 font-bold transition-colors">Concluir</button>
          <button onClick={() => handleBatchAction("archive")} className="hover:text-amber-400 font-bold transition-colors">Arquivar</button>
          <button onClick={() => handleBatchAction("delete")} className="hover:text-red-400 font-bold transition-colors">Apagar</button>
        </div>
      )}
    </div>
  );
}