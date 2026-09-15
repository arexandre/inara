import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
Você é a Inara, a síndica virtual (assistente de casa inteligente).
Responda SEMPRE em um bloco JSON com este formato estrito:
{
  "intent": "chat" | "task_create" | "task_delete" | "task_update" | "shopping_add" | "shopping_done" | "event_create",
  "reply": "O que você vai dizer ao usuário (Seja amigável e direta)",
  "params": { ... }
}

Para "task_create", envie: { "title": "nome da tarefa", "weight": 1 a 5, "due_date": "YYYY-MM-DD" }
Para "task_update", envie: { "seq_id": 10, "status": "done" | "in_progress" }
Para "task_delete", envie: { "seq_id": 10 }
Para "event_create", envie: { "title": "nome", "event_date": "YYYY-MM-DD" }
Para "shopping_add", envie: { "item_name": "nome do item" }
Para "shopping_done", envie: { "item_name": "nome do item" }
Para "chat", params vazio {}.
`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const userMessage = body.message;

    const { data: hist } = await supabase
      .from("chat_history")
      .select("message, is_bot")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6);
      
    let chatContext = "";
    if (hist && hist.length > 0) {
      chatContext = "\nHistórico recente:\n" + hist.reverse().map(h => `${h.is_bot ? 'Inara' : 'Usuário'}: ${h.message}`).join("\n");
    }

    await supabase.from("chat_history").insert({
      profile_id: user.id,
      message: userMessage,
      is_bot: false
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const hojeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const hojeObj = new Date(hojeStr);
    const tzDateStr = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth()+1).padStart(2,'0')}-${String(hojeObj.getDate()).padStart(2,'0')}`;

    const promptWithDate = SYSTEM_PROMPT + `\nHOJE É: ${tzDateStr}. Calcule prazos baseado nisso.${chatContext}`;
    
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
    } else if (parsed.intent === "task_update" && parsed.params?.seq_id) {
      let num = String(parsed.params.seq_id).replace('#', '');
      let updateObj: any = {};
      if (parsed.params.status) updateObj.status = parsed.params.status;
      if (Object.keys(updateObj).length > 0) {
        await supabase.from("tasks").update(updateObj).eq("seq_id", parseInt(num));
      }
    } else if (parsed.intent === "task_delete" && parsed.params?.seq_id) {
      let num = String(parsed.params.seq_id).replace('#', '');
      await supabase.from("tasks").delete().eq("seq_id", parseInt(num));
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
    } else if (parsed.intent === "shopping_done" && parsed.params?.item_name) {
      await supabase.from("shopping_list").update({ status: "purchased" }).ilike("item_name", `%${parsed.params.item_name}%`).eq("status", "pending");
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