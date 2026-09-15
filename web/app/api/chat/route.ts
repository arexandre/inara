import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
Você é a Inara, a síndica virtual (assistente de casa inteligente).
Responda SEMPRE em um bloco JSON com este formato estrito:
{
  "intent": "chat" | "task_create" | "shopping_add" | "event_create",
  "reply": "O que você vai dizer ao usuário (Seja amigável e direta)",
  "params": { ... }
}

Para "task_create", envie: { "title": "nome da tarefa", "weight": 1 a 5, "due_date": "YYYY-MM-DD" } (Trabalho/Esforço).
Para "event_create", envie: { "title": "nome do evento", "event_date": "YYYY-MM-DD" } (Compromissos, festas, lazer).
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

    await supabase.from("chat_history").insert({
      profile_id: user.id,
      message: userMessage,
      is_bot: false
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Injetar a data atual correta no prompt do sistema
    const hojeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const hojeObj = new Date(hojeStr);
    const tzDateStr = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth()+1).padStart(2,'0')}-${String(hojeObj.getDate()).padStart(2,'0')}`;

    const promptWithDate = SYSTEM_PROMPT + `\nHOJE É: ${tzDateStr}. Calcule prazos baseado nisso.`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", systemInstruction: promptWithDate });
    
    const result = await model.generateContent(userMessage);
    const text = result.response.text().trim().replace(/^```json/i, '').replace(/```$/, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      parsed = { intent: "chat", reply: "Deu um curto-circuito nos meus neurônios de IA. Tente de novo!" };
    }

    if (parsed.intent === "task_create" && parsed.params?.title) {
      await supabase.from("tasks").insert({
        title: parsed.params.title,
        status: "backlog",
        weight: parsed.params.weight || 1,
        due_date: parsed.params.due_date || null,
        created_by: user.id
      });
    } else if (parsed.intent === "event_create" && parsed.params?.title) {
      await supabase.from("events").insert({
        title: parsed.params.title,
        event_date: parsed.params.event_date || tzDateStr,
        type: "event",
        created_by: user.id
      });
    } else if (parsed.intent === "shopping_add" && parsed.params?.item_name) {
      await supabase.from("shopping_list").insert({
        item_name: parsed.params.item_name,
        status: "pending"
      });
    }

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