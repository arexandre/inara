"use client";

import { useState } from "react";
import { publishAdminChanges } from "@/app/actions";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  telegram_id: string | null;
  is_admin: boolean;
};

type Invite = {
  id: string; // temp id
  full_name: string;
  username: string;
  email: string;
};

export default function UsuariosClient({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftMode, setDraftMode] = useState(false);

  // Draft form state
  const [inviteName, setInviteName] = useState("");
  const [inviteUser, setInviteUser] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleToggleAdmin = (id: string) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, is_admin: !p.is_admin } : p));
    setDraftMode(true);
    toast.info("Alteração salva no rascunho");
  };

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteUser || !inviteEmail) return;
    setInvites([...invites, { id: Date.now().toString(), full_name: inviteName, username: inviteUser, email: inviteEmail }]);
    setInviteName("");
    setInviteUser("");
    setInviteEmail("");
    setDraftMode(true);
    toast.info("Convite salvo no rascunho");
  };

  const handleRemoveInvite = (id: string) => {
    setInvites(invites.filter(i => i.id !== id));
    if (invites.length === 1 && profiles === initialProfiles) setDraftMode(false);
  };

  const handlePublish = async () => {
    setLoading(true);
    const updates = profiles.filter(p => {
      const orig = initialProfiles.find(o => o.id === p.id);
      return orig && orig.is_admin !== p.is_admin;
    });

    const res = await publishAdminChanges({
      updates: updates.map(u => ({ id: u.id, is_admin: u.is_admin })),
      invites: invites.map(i => ({ email: i.email, full_name: i.full_name, username: i.username }))
    });

    setLoading(false);
    if (res?.error) {
      toast.error(`Erro: ${res.error}`);
    } else {
      toast.success("Alterações publicadas com sucesso! 🚀");
      setDraftMode(false);
      setInvites([]);
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Invite Form */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 p-6 md:p-8">
        <h2 className="font-display font-bold text-xl text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
          <span>➕</span> Convidar Novo Morador (Rascunho)
        </h2>
        <form onSubmit={handleAddInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            value={inviteName} onChange={e => setInviteName(e.target.value)}
            placeholder="Nome completo" required
            className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
          />
          <input
            value={inviteUser} onChange={e => setInviteUser(e.target.value)}
            placeholder="@username" required
            className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
          />
          <input
            type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com" required
            className="bg-warm-50 dark:bg-stone-800 border border-warm-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-400 font-medium"
          />
          <div className="md:col-span-3 flex items-center gap-4">
            <button type="submit" className="bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-bold px-6 py-3 rounded-2xl transition-all">
              Adicionar à Fila de Convites
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden">
        <div className="p-6 border-b border-warm-100 dark:border-stone-800 flex justify-between items-center">
          <h2 className="font-bold text-stone-800 dark:text-stone-200 text-lg">Moradores Cadastrados</h2>
          <span className="text-sm font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
            Bloqueio de Registro: ATIVO
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-warm-50/50 dark:bg-stone-950/50 text-stone-500 text-sm font-bold border-b border-warm-100 dark:border-stone-800">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Telegram ID</th>
                <th className="px-6 py-4">Admin?</th>
                <th className="px-6 py-4">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 dark:divide-stone-800">
              {profiles.map(p => {
                const isChanged = initialProfiles.find(o => o.id === p.id)?.is_admin !== p.is_admin;
                return (
                  <tr key={p.id} className={`transition-colors ${isChanged ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-warm-50 dark:hover:bg-stone-800/50'}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-800 dark:text-stone-200">{p.full_name || p.username}</div>
                      <div className="text-xs text-stone-400">@{p.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      {p.telegram_id ? (
                        <span className="text-sage-600 font-bold bg-sage-50 dark:bg-sage-900/30 px-3 py-1 rounded-lg">
                          {p.telegram_id}
                        </span>
                      ) : (
                        <span className="text-stone-400 font-medium">Não vinculado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.is_admin ? "⭐ Sim" : "Não"}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleAdmin(p.id)} className="text-sm font-bold text-brand-600 hover:text-brand-700">
                        Alternar Admin
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {/* Draft Invites */}
              {invites.map(inv => (
                <tr key={inv.id} className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500">
                  <td className="px-6 py-4">
                    <div className="font-bold text-emerald-800 dark:text-emerald-200">{inv.full_name}</div>
                    <div className="text-xs text-emerald-600">@{inv.username} (Pendente)</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-500 font-medium">{inv.email}</span>
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">Novo</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleRemoveInvite(inv.id)} className="text-sm font-bold text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Publish Button */}
      {draftMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <button
            onClick={handlePublish}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 text-white font-bold px-8 py-4 rounded-full flex items-center gap-3 transition-transform hover:scale-105"
          >
            {loading ? (
              <span>Salvando...</span>
            ) : (
              <>
                <span>🚀</span>
                <span>Publicar Alterações no Banco</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
