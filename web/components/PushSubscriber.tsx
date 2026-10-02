"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [supportPush, setSupportPush] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupportPush(true);
      navigator.serviceWorker.register("/sw.js")
        .then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setIsSubscribed(true);
          });
        })
        .catch(console.error);
    }
  }, []);

  const subscribe = async () => {
    if (!supportPush) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      // Save to database
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });

      if (!response.ok) throw new Error("Falha ao salvar inscrição no servidor");

      setIsSubscribed(true);
      toast.success("Notificações ativadas com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ativar notificações.");
    }
  };

  if (!supportPush || isSubscribed) return null;

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in zoom-in">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div>
          <h4 className="font-bold text-brand-800 text-sm">Habilite Notificações</h4>
          <p className="text-xs text-brand-600 font-medium">Receba alertas de tarefas e contas direto no navegador/celular.</p>
        </div>
      </div>
      <button 
        onClick={subscribe}
        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
      >
        Ativar
      </button>
    </div>
  );
}
