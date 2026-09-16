import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { seq_ids, action } = await req.json();
    if (!seq_ids || seq_ids.length === 0) return NextResponse.json({ success: true });

    if (action === "delete") {
      await supabase.from("tasks").delete().in("seq_id", seq_ids);
    } else if (action === "done") {
      await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).in("seq_id", seq_ids);
    } else if (action === "archive") {
      await supabase.from("tasks").update({ is_archived: true }).in("seq_id", seq_ids);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}