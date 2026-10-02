import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsuariosClient from "./UsuariosClient";

export const metadata = { title: "Governança" };

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <main className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Gestão de Usuários</h1>
        <p className="text-stone-500 font-medium">Controle de acesso e integração com Telegram.</p>
      </header>
      <UsuariosClient initialProfiles={profiles || []} />
    </main>
  );
}