"use client";

import { useState, useEffect } from "react";

type UnifiedItem = {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  type: "task" | "event" | "holiday";
  status?: string;
  assignee?: string;
};

export default function CalendarClient({ initialTasks, initialEvents }: { initialTasks: any[], initialEvents: any[] }) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    // Avoid hydration mismatch by setting the date strictly on client side using Brazil timezone
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    setCurrentDate(new Date(nowStr));
  }, []);

  if (!currentDate) {
    return <div className="p-10 text-center font-bold text-stone-500 animate-pulse">Montando o calendário...</div>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  // Generate grid days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  // padding previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Unify items
  const unified: UnifiedItem[] = [];
  initialTasks.forEach(t => {
    if (t.due_date) {
      unified.push({
        id: "t_" + t.id,
        title: t.title,
        dateStr: t.due_date,
        type: "task",
        status: t.status,
        assignee: t.assignee?.username
      });
    }
  });
  initialEvents.forEach(e => {
    unified.push({
      id: "e_" + e.id,
      title: e.title,
      dateStr: e.event_date,
      type: e.type as any, // "event" or "holiday"
    });
  });

  const getItemsForDate = (date: Date) => {
    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return unified.filter(u => u.dateStr === dStr);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-warm-100 dark:border-stone-800">
        <h2 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-100 uppercase tracking-widest">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="bg-warm-50 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 p-2 px-4 rounded-xl font-bold transition-colors">
            &larr; Anterior
          </button>
          <button onClick={handleNext} className="bg-warm-50 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 p-2 px-4 rounded-xl font-bold transition-colors">
            Próximo &rarr;
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-warm-50/30 dark:bg-stone-950 p-6">
        <div className="grid grid-cols-7 gap-4 min-w-[700px]">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="text-center font-bold text-stone-400 uppercase tracking-widest text-xs mb-2">{d}</div>
          ))}
          
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="min-h-[120px] rounded-2xl bg-white/50 dark:bg-stone-900/50 border border-warm-100 dark:border-stone-800/50 opacity-50"></div>;
            
            const items = getItemsForDate(d);
            const isToday = d.toDateString() === new Date().toDateString();

            return (
              <div key={d.toISOString()} className={`min-h-[120px] rounded-2xl border bg-white dark:bg-stone-900 flex flex-col p-3 transition-colors ${isToday ? 'border-brand-400 shadow-md ring-2 ring-brand-100 dark:ring-brand-900' : 'border-warm-200 dark:border-stone-800 hover:border-warm-300 dark:hover:border-stone-700'}`}>
                <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 ${isToday ? 'bg-brand-600 text-white' : 'text-stone-500'}`}>
                  {d.getDate()}
                </div>
                
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar">
                  {items.map(item => {
                    let colorClass = "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
                    let icon = "";
                    if (item.type === "task") {
                      colorClass = item.status === "done" ? "bg-sage-100/50 text-sage-600 line-through dark:bg-sage-900/30" : "bg-sage-100 text-sage-700 dark:bg-sage-900/50 dark:text-sage-400";
                      icon = "📦";
                    } else if (item.type === "event") {
                      colorClass = "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400 border border-brand-200 dark:border-brand-800";
                      icon = "🎈";
                    } else if (item.type === "holiday") {
                      colorClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-700";
                      icon = "⭐";
                    }
                    
                    return (
                      <div key={item.id} className={`text-xs px-2 py-1 rounded-lg font-bold truncate ${colorClass}`} title={item.title}>
                        <span className="mr-1">{icon}</span>
                        {item.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}