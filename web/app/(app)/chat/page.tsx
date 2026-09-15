import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

export const metadata = { title: "Web Chat" };

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Buscar histórico de chat
  const { data: history } = await supabase
    .from("chat_history")
    .select("id, message, is_bot, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50); // Últimas 50 mensagens

  // Inverter para a ordem cronológica correta
  const initialMessages = (history || []).reverse().map((h) => ({
    id: h.id,
    text: h.message,
    isBot: h.is_bot
  }));

  if (initialMessages.length === 0) {
    initialMessages.push({
      id: "0",
      text: "Olá! Sou a Inara. Como posso ajudar com a casa hoje?",
      isBot: true
    });
  }

  return <ChatClient initialMessages={initialMessages} />;
}