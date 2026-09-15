"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  revalidatePath("/");
}

export async function purchaseShoppingItem(id: string) {
  const supabase = await createClient();
  await supabase.from("shopping_list").update({ status: "purchased" }).eq("id", id);
  revalidatePath("/");
}

export async function payTransaction(transactionId: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", transactionId);
  revalidatePath("/");
}

export async function updateSystemSettings(formData: FormData) {
  const supabase = await createClient();
  const idle_time_min = Number(formData.get("idle_time_min"));
  
  if (!isNaN(idle_time_min)) {
    await supabase.from("system_settings").upsert({
      id: 1,
      idle_time_min,
      updated_at: new Date().toISOString()
    });
  }
  
  revalidatePath("/config");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/");
}

export async function reassignTask(taskId: string, currentAssigneeId: string | null) {
  const supabase = await createClient();
  
  const { data: profiles } = await supabase.from("profiles").select("id");
  if (!profiles || profiles.length === 0) return;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: tasks } = await supabase
    .from("tasks")
    .select("assignee_id, status, weight")
    .gte("created_at", thirtyDaysAgo.toISOString());
    
  const scores: Record<string, number> = {};
  profiles.forEach(p => scores[p.id] = 0);
  
  if (tasks) {
    tasks.forEach(t => {
      const aid = t.assignee_id;
      if (aid && scores[aid] !== undefined) {
        const w = t.weight || 1;
        scores[aid] += (t.status !== "done") ? (w * 2) : w;
      }
    });
  }
  
  // Exclude current assignee so it passes the bomb
  if (currentAssigneeId && scores[currentAssigneeId] !== undefined) {
    delete scores[currentAssigneeId];
  }
  
  let bestId = null;
  let minScore = Infinity;
  for (const [id, score] of Object.entries(scores)) {
    if (score < minScore) {
      minScore = score;
      bestId = id;
    }
  }
  
  if (bestId) {
    await supabase.from("tasks").update({ assignee_id: bestId }).eq("id", taskId);
  }
  
  revalidatePath("/");
}