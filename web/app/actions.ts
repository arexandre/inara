"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Helpers de Segurança
// ---------------------------------------------------------------------------

/** Retorna o usuário autenticado ou lança erro. */
async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

/** Retorna o usuário autenticado e confirma que é admin. */
async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("Sem permissão de administrador");
  return { supabase, user };
}

/** Sanitiza string para prevenir XSS básico em campos de texto livre. */
function sanitizeText(input: string, maxLen = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLen)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Valida que um ID é UUID válido. */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ---------------------------------------------------------------------------
// Ações de Usuário Autenticado
// ---------------------------------------------------------------------------

export async function completeTask(taskId: string) {
  if (!isValidUUID(taskId)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  revalidatePath("/", "layout");
}

export async function purchaseShoppingItem(id: string) {
  if (!isValidUUID(id)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("shopping_list").update({ status: "purchased" }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function payTransaction(transactionId: string) {
  if (!isValidUUID(transactionId)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("transactions").delete().eq("id", transactionId);
  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  if (!isValidUUID(taskId)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/", "layout");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfileSettings(formData: FormData) {
  const { supabase, user } = await requireAuth();

  const theme_preference = formData.get("theme_preference") as string;
  const personal_context = formData.get("personal_context") as string;

  // Validar valores permitidos para tema
  const validThemes = ["light", "dark", "system"];
  const safeTheme = validThemes.includes(theme_preference) ? theme_preference : "light";

  await supabase.from("profiles").update({
    theme_preference: safeTheme,
    personal_context: sanitizeText(personal_context || "", 2000),
  }).eq("id", user.id);

  // Se admin, também salva system_settings
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin) {
    const idle_time_min = Number(formData.get("idle_time_min"));
    const house_address = formData.get("house_address") as string;
    const house_rules = formData.get("house_rules") as string;

    if (!isNaN(idle_time_min) && idle_time_min >= 1 && idle_time_min <= 1440) {
      await supabase.from("system_settings").upsert({
        id: 1,
        idle_time_min,
        house_address: sanitizeText(house_address || "", 500),
        house_rules: sanitizeText(house_rules || "", 5000),
        updated_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath("/", "layout");
}

export async function reassignTask(taskId: string, currentAssigneeId: string | null) {
  if (!isValidUUID(taskId)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();

  const { data: profiles } = await supabase.from("profiles").select("id");
  if (!profiles || profiles.length === 0) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("assignee_id, status, weight")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const scores: Record<string, number> = {};
  profiles.forEach((p) => (scores[p.id] = 0));

  if (tasks) {
    tasks.forEach((t) => {
      const aid = t.assignee_id;
      if (aid && scores[aid] !== undefined) {
        const w = t.weight || 1;
        scores[aid] += t.status !== "done" ? w * 2 : w;
      }
    });
  }

  if (currentAssigneeId && scores[currentAssigneeId] !== undefined) {
    delete scores[currentAssigneeId];
  }

  let bestId: string | null = null;
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

export async function requestDeadlineExtension(taskId: string, title: string) {
  if (!isValidUUID(taskId)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();

  await supabase.from("pending_actions").insert({
    intent: "chat",
    payload: { reply: "Inara, preciso de mais prazo para a tarefa: " + sanitizeText(title, 200) },
    chat_id: 0,
  });
}

// ---------------------------------------------------------------------------
// Ações do Mural (Autenticado)
// ---------------------------------------------------------------------------

export async function addMuralNote(message: string) {
  const { supabase, user } = await requireAuth();

  const safeMessage = sanitizeText(message, 2000);
  if (!safeMessage.trim()) throw new Error("Mensagem vazia");

  let formattedMessage = safeMessage;
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genai.getGenerativeModel({ model: "gemini-3.5-flash" });
    const prompt = `Você é a Inara, síndica da casa. Formate a seguinte mensagem para um Mural de Avisos com emojis e estilo direto. Mantenha curto. NUNCA inclua tags HTML ou scripts.\nMensagem: ${safeMessage}`;
    const result = await model.generateContent(prompt);
    formattedMessage = result.response.text();
  } catch (e) {
    console.error("AI formatting failed", e);
  }

  await supabase.from("mural_notes").insert({
    message: formattedMessage,
    created_by: user.id,
  });

  revalidatePath("/dashboard");
}

export async function pinMuralNote(id: string, is_pinned: boolean) {
  if (!isValidUUID(id)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("mural_notes").update({ is_pinned }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function deleteMuralNote(id: string) {
  if (!isValidUUID(id)) return { error: "ID inválido" };
  const { supabase } = await requireAuth();
  await supabase.from("mural_notes").delete().eq("id", id);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Ações Administrativas (Requer is_admin)
// ---------------------------------------------------------------------------

export async function inviteUser(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const email = formData.get("email") as string;
  const full_name = formData.get("full_name") as string;
  const username = formData.get("username") as string;

  if (!email || !full_name || !username) return { error: "Preencha todos os campos" };

  // Validar formato de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido" };

  // Validar username (alfanumérico + underscore, 3-30 chars)
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return { error: "Username inválido (3-30 chars, alfanumérico)" };

  try {
    const adminSb = createAdminClient();

    const { data: newUser, error: authError } = await adminSb.auth.admin.createUser({
      email,
      password: `Inara_${Date.now()}`,
      email_confirm: true,
      user_metadata: { full_name: sanitizeText(full_name, 100), username },
    });

    if (authError) return { error: authError.message };

    if (newUser?.user) {
      await adminSb.from("profiles").upsert({
        id: newUser.user.id,
        full_name: sanitizeText(full_name, 100),
        username,
        is_admin: false,
        theme_preference: "light",
      });
    }

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: message };
  }
}

export async function publishAdminChanges(draft: {
  updates: { id: string; is_admin: boolean }[];
  invites: { email: string; full_name: string; username: string }[];
}) {
  await requireAdmin();

  // Validar IDs
  for (const update of draft.updates) {
    if (!isValidUUID(update.id)) return { error: `ID inválido: ${update.id}` };
  }

  const adminSb = createAdminClient();

  for (const update of draft.updates) {
    await adminSb.from("profiles").update({ is_admin: update.is_admin }).eq("id", update.id);
  }

  for (const invite of draft.invites) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) continue;
    const { data: newUser } = await adminSb.auth.admin.createUser({
      email: invite.email,
      password: `Inara_${Date.now()}`,
      email_confirm: true,
      user_metadata: { full_name: sanitizeText(invite.full_name, 100), username: invite.username },
    });
    if (newUser?.user) {
      await adminSb.from("profiles").upsert({
        id: newUser.user.id,
        full_name: sanitizeText(invite.full_name, 100),
        username: invite.username,
        is_admin: false,
        theme_preference: "light",
      });
    }
  }

  await adminSb.from("notifications").insert({
    title: "Atualização de Governança",
    message: "O Admin acaba de atualizar as regras/cadastros do sistema.",
  });

  await adminSb.from("system_commands").insert({
    command: "notify_admin_publish",
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleRoutine(id: string, is_active: boolean) {
  if (!isValidUUID(id)) return { error: "ID inválido" };
  await requireAdmin();

  const adminSb = createAdminClient();
  await adminSb.from("custom_routines").update({ is_active }).eq("id", id);

  revalidatePath("/admin/rotinas");
  return { success: true };
}

export async function triggerRoutine(command: string) {
  await requireAdmin();

  // Whitelist de comandos permitidos
  const allowedCommands = [
    "force_bom_dia", "force_ping", "ping_de_ociosidade", "cobrar_pagamentos",
    "boa_noite", "finance_checkout", "resumo_matinal", "garbage_collector",
    "notify_admin_publish",
  ];

  // Permitir comandos da whitelist ou comandos customizados com prefixo seguro
  const safeCommand = command.replace(/[^a-zA-Z0-9_]/g, "");
  if (!allowedCommands.includes(safeCommand) && !safeCommand.startsWith("rotina_")) {
    return { error: "Comando não permitido" };
  }

  const adminSb = createAdminClient();
  await adminSb.from("system_commands").insert({ command: safeCommand });

  return { success: true };
}
