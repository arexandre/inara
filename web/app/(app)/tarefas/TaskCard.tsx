"use client";

import { useState, useRef, useEffect, MouseEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTask, reassignTask, deleteTask } from "@/app/actions";
import type { Task } from "@/types/database";
import { toast } from "sonner";

export default function TaskCard({ task }: { task: Task & { assignee?: { username: string } } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleDotClick = (e: MouseEvent) => {
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ x: rect.right - 150, y: rect.bottom + 5 }); // approximate placement
    }
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <div
          onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e); }}
          className="relative bg-white dark:bg-stone-900 p-5 flex flex-col gap-3 rounded-2xl shadow-sm border border-warm-100 dark:border-stone-800 transition-all group cursor-context-menu h-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-500">#{String(task.seq_id).padStart(4, "0")}</span>
            <button
              ref={buttonRef}
              onClick={handleDotClick}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors relative z-10"
            >
              ⋮
            </button>
          </div>
          <h3 className="font-bold text-stone-800 dark:text-stone-200 leading-snug">
            {task.emoji ? `${task.emoji} ` : ""}{task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-stone-500 font-medium line-clamp-2">{task.description}</p>
          )}
          {(task.due_date || task.due_time) && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-400 mt-1">
              <span>📅</span>
              <span>
                {task.due_date ? new Date(task.due_date + "T12:00:00").toLocaleDateString("pt-BR", { day: 'numeric', month: 'short' }) : ""}
                {task.due_date && task.due_time ? ", " : ""}
                {task.due_time ? task.due_time.substring(0, 5) : ""}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-warm-100/50 dark:border-stone-800/50">
            <div className="text-sm font-bold text-sage-600 dark:text-sage-400">
              @{task.assignee?.username ?? "sem dono"}
            </div>
            {task.xp_reward && (
              <div className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                +{task.xp_reward} XP
              </div>
            )}
            {!task.xp_reward && task.weight && (
              <div className="text-xs font-bold text-stone-400">
                Peso: {task.weight}
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-12 z-50 min-w-[180px] bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-warm-200 dark:border-stone-700 py-2 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {task.status !== "done" && (
              <>
                <button
                  onClick={() => { 
                    setMenuOpen(false); 
                    startTransition(async () => {
                      await completeTask(task.id);
                      toast.success("Tarefa Concluída");
                      router.refresh();
                    });
                  }}
                  disabled={isPending}
                  className="px-4 py-2 text-left text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-sage-50 dark:hover:bg-sage-900/30 hover:text-sage-700 dark:hover:text-sage-400 transition-colors disabled:opacity-50"
                >
                  ✅ Concluir
                </button>
                <button
                  onClick={() => { 
                    setMenuOpen(false); 
                    startTransition(async () => {
                      await reassignTask(task.id, task.assignee_id);
                      toast.success("Tarefa reatribuída");
                      router.refresh();
                    });
                  }}
                  disabled={isPending}
                  className="px-4 py-2 text-left text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-400 transition-colors disabled:opacity-50"
                >
                  🎲 Solicitar Resorteio
                </button>
                <button
                  onClick={() => { 
                    setMenuOpen(false);
                    startTransition(async () => {
                      try {
                        const { requestDeadlineExtension } = await import('@/app/actions');
                        await requestDeadlineExtension(task.id, task.title);
                        toast.success("Inara foi acionada para negociar o prazo!");
                      } catch(e) {
                        toast.error("Erro ao acionar a Inara.");
                      }
                    });
                  }}
                  className="px-4 py-2 text-left text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  ⏳ Pedir mais prazo
                </button>
                <button
                  onClick={() => { 
                    setMenuOpen(false);
                    toast.info("Edição abrirá modal...");
                  }}
                  className="px-4 py-2 text-left text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                >
                  ✏️ Editar
                </button>
                <div className="h-px bg-warm-100 dark:bg-stone-700 my-1"></div>
              </>
            )}
            <button
              onClick={() => { 
                setMenuOpen(false); 
                startTransition(async () => {
                  await deleteTask(task.id);
                  toast.success("Tarefa apagada");
                  router.refresh();
                });
              }}
              disabled={isPending}
              className="px-4 py-2 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              🗑️ Apagar
            </button>
          </div>
        )}
      </div>
    </>
  );
}
