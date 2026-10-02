import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const auth = subscription.keys?.auth;
    const p256dh = subscription.keys?.p256dh;

    if (!auth || !p256dh) {
      return NextResponse.json({ error: "Missing keys" }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || "unknown";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id: user.id,
        endpoint: subscription.endpoint,
        auth,
        p256dh,
        user_agent: userAgent
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error("Erro ao salvar subscription:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
