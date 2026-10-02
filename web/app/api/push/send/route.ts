import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webPush from "web-push";

// Configuration for web-push
webPush.setVapidDetails(
  "mailto:suporte@inara.local",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    
    // Simplest auth for python backend: use Supabase Service Role Key as Bearer token
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, profile_id } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (profile_id) {
      query = query.eq("profile_id", profile_id);
    }
    
    const { data: subs, error } = await query;
    
    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, delivered: 0, note: "No subscriptions found" });
    }

    const payload = JSON.stringify({ title, body, icon: '/icon-192x192.png' });
    let delivered = 0;

    const promises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh
        }
      };
      
      try {
        await webPush.sendNotification(pushSubscription, payload);
        delivered++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Inscrição expirada, deletar do banco
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Erro ao enviar push:", err);
        }
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, delivered });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
