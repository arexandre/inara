"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteMuralNote, pinMuralNote } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SafeHTML } from "@/lib/sanitize";

type Note = {
  id: string;
  message: string;
  created_at: string;
  is_pinned: boolean;
  profiles?: { full_name: string; username: string };
};

export default function MuralClient({ initialNotes, isAdmin }: { initialNotes: Note[], isAdmin: boolean }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel('realtime_mural')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mural_notes' },
        (payload) => {
          router.refresh(); // Refresh para pegar os profiles também
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("pending_actions").insert({
        intent: "chat",
        payload: { reply: "Por favor, adicione este aviso no mural: " + newMessage },
        chat_id: 0,
        status: "pending"
      });
      if (error) throw error;
      setNewMessage("");
      toast.success("Pedido enviado! A Inara vai redigir e fixar em breve.");
    } catch (err) {
      toast.error("Erro ao enviar aviso.");
    } finally {
      setLoading(false);
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned === b.is_pinned) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.is_pinned ? -1 : 1;
  });

  return (
    <section className="bg-warm-100/30 dark:bg-stone-900/30 border border-warm-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-display font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
          📌 Mural da Casa
        </h2>
      </header>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {sortedNotes.map((note) => (
          <div key={note.id} className={`p-5 rounded-2xl border ${note.is_pinned ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'} relative group shadow-sm`}>
            {note.is_pinned && <span className="absolute -top-3 -right-3 text-2xl">⭐</span>}
            <SafeHTML html={note.message} className="text-stone-800 dark:text-stone-300 whitespace-pre-wrap text-sm" />
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-xs text-stone-500">
              <span className="font-bold">{note.profiles?.full_name || 'Inara'}</span>
              <span>{new Date(note.created_at).toLocaleDateString()}</span>
            </div>
            
            {(isAdmin || !note.profiles) && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={() => pinMuralNote(note.id, !note.is_pinned)} className="p-1.5 bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 hover:text-amber-500">
                  📌
                </button>
                <button onClick={() => deleteMuralNote(note.id)} className="p-1.5 bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 hover:text-red-500">
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-3">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Peça para a Inara adicionar um novo aviso..."
          className="flex-1 bg-white dark:bg-stone-900 border border-warm-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
          {loading ? "..." : "Adicionar"}
        </button>
      </form>
    </section>
  );
}
