import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.IOT_WEBHOOK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    if (!payload || !payload.device) {
      return NextResponse.json({ error: "Invalid payload. 'device' is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Log the event to system_logs
    await supabase.from("system_logs").insert({
      level: "info",
      source: "iot_webhook",
      message: `Device ${payload.device} triggered: ${payload.action || 'unknown'}`
    });

    // Injetar mensagem para a IA (ela será processada pelo bot Python via check_pending_chats)
    // Usamos chat_id 0 para rotear ao primeiro admin
    const aiMessage = `O seguinte evento IoT ocorreu agora na casa:\nDispositivo: ${payload.device}\nAção/Evento: ${payload.action || 'Desconhecida'}\nDetalhes: ${JSON.stringify(payload)}\nPor favor, envie uma mensagem no grupo avisando sobre isso de acordo com a sua persona de Síndica.`;
    
    await supabase.from("pending_actions").insert({
      intent: "chat",
      payload: { reply: aiMessage },
      chat_id: 0,
      status: "pending"
    });

    return NextResponse.json({ success: true, message: "Evento IoT recebido e roteado para a Inara." });
  } catch (error) {
    console.error("IoT Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
