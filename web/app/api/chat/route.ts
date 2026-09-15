import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
Você é a Inara, a síndica virtual (assistente de casa inteligente).
Responda SEMPRE em um bloco JSON com este formato estrito:
{
  "intent": "chat" | "task_create" | "shopping_add",
  "reply": "O que você vai dizer ao usuário (Seja amigável e direta)",
  "params": { ... dependendo do intent ... }
}

Para "task_create", envie: { "title": "nome da tarefa", "weight": 1 a 5 }
Para "shopping_add", envie: { "item_name": "nome do item" }
Para "chat", params vazio {}.
`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const userMessage = body.message;

    // Save user message to history
    await supabase.from("chat_history").insert({
      profile_id: user.id,
      message: userMessage,
      is_bot: false
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", systemInstruction: SYSTEM_PROMPT });
    
    const result = await model.generateContent(userMessage);
    const text = result.response.text().trim().replace(/^```json/i, '').replace(/```$/, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      parsed = { intent: "chat", reply: "Deu um curto-circuito nos meus neurônios de IA. Tente de novo!" };
    }

    // Executar ação no banco
    if (parsed.intent === "task_create" && parsed.params?.title) {
      await supabase.from("tasks").insert({
        title: parsed.params.title,
        status: "backlog",
        weight: parsed.params.weight || 1,
        created_by: user.id
      });
    } else if (parsed.intent === "shopping_add" && parsed.params?.item_name) {
      await supabase.from("shopping_list").insert({
        item_name: parsed.params.item_name,
        status: "pending"
      });
    }

    // Save bot message to history
    await supabase.from("chat_history").insert({
      profile_id: user.id,
      message: parsed.reply,
      is_bot: true
    });

    return NextResponse.json({ reply: parsed.reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}