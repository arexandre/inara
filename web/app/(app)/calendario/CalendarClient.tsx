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
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    setCurrentDate(new Date(nowStr));
  }, []);

  if (!currentDate) {
    return <div className="p-10 text-center font-bold text-stone-500 animate-pulse">Montando o calendário...</div>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toDateString();

  const handlePrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    setCurrentDate(new Date(nowStr));
  };

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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;
    return unified.filter(u => u.dateStr === dStr);
  };

  // Generate grid logic
  let days: (Date | null)[] = [];
  let numRows = 0;

  if (view === "month") {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // padding previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // pad end to complete the week
    const remainder = days.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        days.push(null);
      }
    }
    numRows = days.length / 7;
  } else if (view === "week") {
    // Current week based on currentDate
    const currentDayOfWeek = currentDate.getDay(); // 0-6
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    numRows = 1;
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gridTemplateRows: `auto repeat(${numRows}, minmax(0, 1fr))`,
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden relative">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 md:p-6 border-b border-warm-200 dark:border-stone-800 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-100 capitalize tracking-tight w-48">
            {view === "month" ? `${monthNames[month]} ${year}` : "Semana"}
          </h2>
          <div className="flex bg-warm-100 dark:bg-stone-800 rounded-xl p-1">
            <button 
              onClick={() => setView("month")} 
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${view === "month" ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm" : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"}`}
            >
              Mês
            </button>
            <button 
              onClick={() => setView("week")} 
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${view === "week" ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm" : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"}`}
            >
              Semana
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleToday} className="bg-warm-100 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 px-4 py-2 rounded-xl font-bold transition-colors text-sm">
            Hoje
          </button>
          <button onClick={handlePrev} className="bg-warm-100 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 px-3 py-2 rounded-xl font-bold transition-colors">
            &larr;
          </button>
          <button onClick={handleNext} className="bg-warm-100 dark:bg-stone-800 hover:bg-warm-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 px-3 py-2 rounded-xl font-bold transition-colors">
            &rarr;
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-warm-50/30 dark:bg-stone-950">
        <div style={gridStyle} className="h-full min-w-[700px] border-l border-t border-warm-200 dark:border-stone-800">
          
          {/* Header Row */}
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="text-center font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-xs py-3 border-r border-b border-warm-200 dark:border-stone-800 bg-warm-100/50 dark:bg-stone-900">
              {d}
            </div>
          ))}
          
          {/* Days */}
          {days.map((d, i) => {
            if (!d) return (
              <div key={`empty-${i}`} className="bg-warm-50 dark:bg-stone-900/50 border-r border-b border-warm-200 dark:border-stone-800 opacity-50 pointer-events-none"></div>
            );
            
            const items = getItemsForDate(d);
            const isToday = d.toDateString() === todayStr;

            return (
              <div 
                key={d.toISOString()} 
                onClick={() => setSelectedDay(d)}
                className={`group flex flex-col p-2 border-r border-b border-warm-200 dark:border-stone-800 bg-white dark:bg-stone-900 cursor-pointer hover:bg-warm-50 dark:hover:bg-stone-800 transition-colors overflow-hidden min-h-[100px] ${isToday ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
              >
                <div className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-brand-600 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
                  {d.getDate()}
                  {isToday && view === "week" && <span className="ml-2 text-xs font-medium uppercase opacity-80">(Hoje)</span>}
                </div>
                
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {items.map(item => {
                    let colorClass = "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";
                    let icon = "📝";
                    if (item.type === "task") {
                      colorClass = item.status === "done" ? "bg-sage-100/50 text-sage-600 line-through border-sage-200 dark:bg-sage-900/30 dark:border-sage-800" : "bg-sage-100 text-sage-800 border-sage-200 dark:bg-sage-900/60 dark:text-sage-300 dark:border-sage-800";
                      icon = "🎯";
                    } else if (item.type === "event") {
                      colorClass = "bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-900/60 dark:text-brand-300 dark:border-brand-800";
                      icon = "🎈";
                    } else if (item.type === "holiday") {
                      colorClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-400 dark:border-amber-700";
                      icon = "🌟";
                    }
                    
                    return (
                      <div key={item.id} className={`text-xs px-2 py-1 rounded-md border font-bold truncate ${colorClass}`} title={item.title}>
                        <span className="mr-1.5">{icon}</span>
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

      {/* Expanded Day Modal */}
      {selectedDay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDay(null)}>
          <div 
            className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-warm-200 dark:border-stone-800 flex justify-between items-center bg-warm-50 dark:bg-stone-950">
              <div>
                <h3 className="font-display font-bold text-2xl text-stone-800 dark:text-stone-100">
                  {selectedDay.getDate()} de {monthNames[selectedDay.getMonth()]}
                </h3>
                <p className="text-stone-500 font-medium text-sm">
                  {selectedDay.getFullYear()} • {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][selectedDay.getDay()]}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-warm-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-warm-300 dark:hover:bg-stone-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {getItemsForDate(selectedDay).length === 0 ? (
                <div className="text-center py-10 text-stone-400 font-medium">Nenhum evento para este dia.</div>
              ) : (
                <div className="space-y-3">
                  {getItemsForDate(selectedDay).map(item => (
                    <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-warm-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                       <div className="text-2xl pt-0.5">
                         {item.type === "task" ? "🎯" : item.type === "event" ? "🎈" : "🌟"}
                       </div>
                       <div className="flex-1">
                         <div className={`font-bold text-lg ${item.type === "task" && item.status === "done" ? "line-through text-stone-400" : "text-stone-800 dark:text-stone-100"}`}>
                           {item.title}
                         </div>
                         <div className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-1 flex gap-2 flex-wrap">
                           <span className="uppercase tracking-wider text-[10px] bg-warm-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                             {item.type === "task" ? "Tarefa" : item.type === "event" ? "Evento" : "Feriado"}
                           </span>
                           {item.assignee && (
                             <span className="uppercase tracking-wider text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 rounded-full">
                               @{item.assignee}
                             </span>
                           )}
                           {item.status && item.status === "done" && (
                             <span className="uppercase tracking-wider text-[10px] bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400 px-2 py-0.5 rounded-full">
                               Concluída
                             </span>
                           )}
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}