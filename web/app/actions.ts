"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  revalidatePath("/");
}

export async function purchaseShoppingItem(seqId: number) {
  const supabase = await createClient();
  await supabase.from("shopping_list").update({ status: "purchased" }).eq("seq_id", seqId);
  revalidatePath("/");
}

export async function payTransaction(transactionId: string) {
  const supabase = await createClient();
  // Simplified: maybe mark as paid or delete. We'll just delete for now or update a status if it existed.
  // Actually, we can just delete it from ledger to represent it was paid off in MVP.
  await supabase.from("transactions").delete().eq("id", transactionId);
  revalidatePath("/");
}