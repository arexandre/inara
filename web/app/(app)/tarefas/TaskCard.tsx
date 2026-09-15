"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { completeTask, reassignTask, deleteTask } from "@/app/actions";
import type { Task } from "@/types/database";

export default function TaskCard({ task }: { task: Task & { assignee?: { username: string } } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      <div
        onContextMenu={handleContextMenu}
        className="relative bg-white p-5 flex flex-col gap-3 rounded-2xl shadow-sm border border-warm-100 transition-all hover:shadow-md hover:border-brand-200 group cursor-context-menu"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-500">#{String(task.seq_id).padStart(4, "0")}</span>
          <button
            ref={buttonRef}
            onClick={handleDotClick}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
          >
            ⋮
          </button>
        </div>
        <h3 className="font-bold text-stone-800 leading-snug">{task.title}</h3>
        {task.description && (
          <p className="text-sm text-stone-500 font-medium line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-warm-100/50">
          <div className="text-sm font-bold text-sage-600">
            @{task.assignee?.username ?? "sem dono"}
          </div>
          {task.weight && (
            <div className="text-xs font-bold text-stone-400">
              Peso: {task.weight}
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          style={{ top: menuPos.y, left: menuPos.x }}
          className="fixed z-50 min-w-[180px] bg-white rounded-xl shadow-xl border border-warm-200 py-2 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {task.status !== "done" && (
            <>
              <button
                onClick={async () => { setMenuOpen(false); await completeTask(task.id); }}
                className="px-4 py-2 text-left text-sm font-bold text-stone-700 hover:bg-sage-50 hover:text-sage-700 transition-colors"
              >
                ✓ Concluir
              </button>
              <button
                onClick={async () => { setMenuOpen(false); await reassignTask(task.id, task.assignee_id); }}
                className="px-4 py-2 text-left text-sm font-bold text-stone-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                🎲 Solicitar Resorteio
              </button>
              <div className="h-px bg-warm-100 my-1"></div>
            </>
          )}
          <button
            onClick={async () => { setMenuOpen(false); await deleteTask(task.id); }}
            className="px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            🗑️ Apagar
          </button>
        </div>
      )}
    </>
  );
}
