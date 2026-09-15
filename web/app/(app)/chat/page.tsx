"use client";

import { useState, useEffect, useRef } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{id: string; text: string; isBot: boolean}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: "0", text: "Olá! Sou a Inara. Como posso ajudar com a casa hoje?", isBot: true }]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, text: userMsg, isBot: false }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: data.reply, isBot: true }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "⚠️ Erro de conexão.", isBot: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100dvh-2rem)] p-4 md:p-6 max-w-4xl mx-auto w-full">
      <header className="shrink-0 mb-4 px-2 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl shadow-sm border border-brand-200 dark:border-brand-900/50">🤖</div>
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Inara Chat</h1>
          <p className="text-xs font-bold text-sage-600 dark:text-sage-400 uppercase tracking-wider">Assistente Conectada</p>
        </div>
      </header>

      <div className="flex-1 bg-warm-100/30 dark:bg-stone-900/50 rounded-3xl border border-warm-200 dark:border-stone-800 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isBot ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-3xl shadow-sm border ${
              m.isBot 
                ? "bg-white dark:bg-stone-800 border-warm-200 dark:border-stone-700 rounded-tl-sm text-stone-800 dark:text-stone-200" 
                : "bg-brand-600 dark:bg-brand-700 border-brand-700 dark:border-brand-800 rounded-tr-sm text-white"
            }`}>
              <p className="text-[15px] leading-relaxed font-medium">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[70%] p-4 rounded-3xl shadow-sm border bg-white dark:bg-stone-800 border-warm-200 dark:border-stone-700 rounded-tl-sm text-stone-400">
              <span className="animate-pulse font-bold tracking-widest">...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="shrink-0 mt-4 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Peça para criar uma tarefa, comprar leite..."
          className="flex-1 bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 text-stone-800 dark:text-stone-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/50 transition-all shadow-sm font-medium"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="bg-brand-600 disabled:bg-stone-300 dark:disabled:bg-stone-800 hover:bg-brand-700 text-white font-bold p-4 rounded-2xl shadow-sm transition-all"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}