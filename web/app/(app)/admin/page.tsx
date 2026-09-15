import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Uso de API" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sum tokens grouped by service
  const { data: logs, error } = await supabase
    .from("api_usage_logs")
    .select("service_name, tokens_used, created_at");

  let summary: Record<string, number> = {};
  if (logs) {
    logs.forEach((log) => {
      summary[log.service_name] = (summary[log.service_name] || 0) + log.tokens_used;
    });
  }

  return (
    <main className="space-y-6 p-6 md:p-10 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold text-stone-800">
          Uso de API
        </h1>
        <p className="text-sm text-stone-500">
          Monitoramento de cotas de IA e serviços externos.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(summary).length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum uso registrado ainda.</p>
        ) : (
          Object.entries(summary).map(([service, tokens]) => (
            <div key={service} className="card p-6 border border-stone-200">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                {service}
              </h3>
              <p className="text-3xl font-display font-semibold text-brand-600">
                {tokens.toLocaleString("pt-BR")} <span className="text-sm font-medium text-stone-400">tokens</span>
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}