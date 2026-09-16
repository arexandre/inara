"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Verificar se é admin
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "Sem permissão" };

  const email = formData.get("email") as string;
  const full_name = formData.get("full_name") as string;
  const username = formData.get("username") as string;

  if (!email || !full_name || !username) return { error: "Preencha todos os campos" };

  try {
    const adminSb = createAdminClient();
    
    // Criar usuário via Admin API (bypassa bloqueio de signup)
    const { data: newUser, error: authError } = await adminSb.auth.admin.createUser({
      email,
      password: `Inara_${Date.now()}`, // Senha temporária - usuário reseta via email
      email_confirm: true,
      user_metadata: { full_name, username },
    });

    if (authError) return { error: authError.message };

    // Criar perfil na tabela profiles
    if (newUser?.user) {
      await adminSb.from("profiles").upsert({
        id: newUser.user.id,
        full_name,
        username,
        is_admin: false,
        theme_preference: "light",
      });
    }

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  revalidatePath("/", "layout");
}

export async function purchaseShoppingItem(id: string) {
  const supabase = await createClient();
  await supabase.from("shopping_list").update({ status: "purchased" }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function payTransaction(transactionId: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", transactionId);
  revalidatePath("/", "layout");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/", "layout");
}

export async function updateProfileSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const theme_preference = formData.get("theme_preference") as string;
  const personal_context = formData.get("personal_context") as string;
  
  await supabase.from("profiles").update({
    theme_preference,
    personal_context
  }).eq("id", user.id);

  // Se admin, também salva system_settings
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin) {
    const idle_time_min = Number(formData.get("idle_time_min"));
    const house_address = formData.get("house_address") as string;
    const house_rules = formData.get("house_rules") as string;
    
    if (!isNaN(idle_time_min)) {
      await supabase.from("system_settings").upsert({
        id: 1,
        idle_time_min,
        house_address,
        house_rules,
        updated_at: new Date().toISOString()
      });
    }
  }
  
  revalidatePath("/", "layout");
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
  
  revalidatePath("/", "layout");
}