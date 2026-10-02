"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/types/database";

interface TxWithProfile extends Transaction {
  payer?: { username: string };
}

export default function TransactionsClient({ initialTransactions }: { initialTransactions: TxWithProfile[] }) {
  const [transactions, setTransactions] = useState<TxWithProfile[]>(initialTransactions);
  const supabase = createClient();
  const router = useRouter();

  const handleUploadReceipt = async (txId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      toast.info("Fazendo upload do comprovante...");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${txId}-${Math.random()}.${fileExt}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ receipt_url: publicUrl })
          .eq('id', txId);
        
        if (updateError) throw updateError;
        
        toast.success("Comprovante anexado!");
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, receipt_url: publicUrl } : t));
      } catch (err) {
        toast.error("Erro ao salvar comprovante.");
        console.error(err);
      }
    };
    
    input.click();
  };

  const handlePay = async (txId: string) => {
    if (!confirm("Isso excluirá a transação para fechar o rateio. Continuar?")) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      toast.success("Transação quitada!");
      setTransactions(prev => prev.filter(t => t.id !== txId));
      router.refresh(); // Refresh para atualizar o saldo
    } catch (e) {
      toast.error("Erro ao quitar transação.");
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-warm-200 dark:border-stone-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-warm-50 dark:bg-stone-800/50 border-b border-warm-200 dark:border-stone-800 text-xs uppercase tracking-wider text-stone-500 font-bold">
              <th className="p-5 font-bold">Data</th>
              <th className="p-5 font-bold">Descrição</th>
              <th className="p-5 font-bold">Pagador</th>
              <th className="p-5 font-bold text-right">Valor</th>
              <th className="p-5 font-bold text-center">Tipo</th>
              <th className="p-5 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 dark:divide-stone-800">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-warm-50/50 dark:hover:bg-stone-800/30 transition-colors group">
                <td className="p-5 text-sm font-medium text-stone-500 whitespace-nowrap">
                  {new Date(tx.transaction_date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                </td>
                <td className="p-5">
                  <div className="font-bold text-stone-800 dark:text-stone-200">{tx.description}</div>
                  {tx.category && <div className="text-xs font-bold text-stone-400 mt-0.5">{tx.category}</div>}
                </td>
                <td className="p-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-400 text-xs font-bold border border-sage-200 dark:border-sage-800">
                    @{tx.payer?.username}
                  </span>
                </td>
                <td className="p-5 text-right font-display font-bold text-lg text-stone-800 dark:text-stone-200 whitespace-nowrap">
                  R$ {Number(tx.amount).toFixed(2)}
                </td>
                <td className="p-5 text-center">
                  <span className={`text-xs font-bold uppercase tracking-wider ${tx.type === 'collective' ? 'text-brand-600 dark:text-brand-400' : 'text-amber-600 dark:text-amber-500'}`}>
                    {tx.type === 'collective' ? 'Coletivo' : 'Individual'}
                  </span>
                </td>
                <td className="p-5 flex items-center justify-end gap-2">
                  {tx.receipt_url ? (
                    <a 
                      href={tx.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-2 rounded-xl transition-colors border border-blue-200 dark:border-blue-800"
                      title="Ver Comprovante"
                    >
                      📄 Ver
                    </a>
                  ) : (
                    <button 
                      onClick={() => handleUploadReceipt(tx.id)}
                      className="text-xs font-bold bg-white dark:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 border border-warm-200 dark:border-stone-700 hover:border-warm-300 px-3 py-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Anexar Comprovante"
                    >
                      📎 Anexar
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handlePay(tx.id)}
                    className="text-xs font-bold bg-white dark:bg-stone-800 text-stone-400 hover:text-brand-600 dark:hover:text-brand-400 border border-warm-200 dark:border-stone-700 hover:border-brand-200 px-3 py-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Quitar / Deletar"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <span className="text-4xl">🕊️</span>
                    <h3 className="font-bold text-stone-700 dark:text-stone-300">Nenhum gasto registrado</h3>
                    <p className="text-sm text-stone-500 max-w-sm mx-auto">Sua casa está em paz com as finanças. Registre gastos coletivos ou individuais e eles aparecerão aqui.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
