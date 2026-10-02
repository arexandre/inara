"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifs();

    const sub = supabase
      .channel("notifications_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [supabase]);

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="p-3 bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 rounded-full shadow-sm hover:shadow-md hover:bg-warm-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center relative"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-stone-900 animate-pulse"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-warm-100 dark:border-stone-800 bg-warm-50/50 dark:bg-stone-950/50">
            <h3 className="font-bold text-stone-800 dark:text-stone-200">Notificações</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-sm font-medium">
                Tudo tranquilo por aqui. ✨
              </div>
            ) : (
              <div className="divide-y divide-warm-100 dark:divide-stone-800">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 hover:bg-warm-50 dark:hover:bg-stone-800/50 transition-colors">
                    <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">{n.title}</h4>
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{n.message}</p>
                    <span className="text-xs text-stone-400 mt-2 block">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
