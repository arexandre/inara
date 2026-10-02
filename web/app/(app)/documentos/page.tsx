import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: documents, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-5xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-stone-900 dark:text-stone-100">
          📄 Documentos & Wiki
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          Base de conhecimento da casa
        </p>
      </header>

      {(!documents || documents.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 bg-stone-100 dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700">
          <span className="text-4xl mb-4">📭</span>
          <h3 className="text-xl font-display font-bold text-stone-900 dark:text-stone-100">Nenhum documento</h3>
          <p className="text-stone-500 dark:text-stone-400 mt-2 text-center">
            A base de conhecimento está vazia no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-col bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  {doc.category || 'Geral'}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h3 className="text-lg font-display font-bold text-stone-900 dark:text-stone-100 mb-2">
                {doc.title}
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-sm line-clamp-3 whitespace-pre-wrap flex-grow">
                {doc.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
