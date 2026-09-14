/**
 * Tipos TypeScript derivados do schema do Supabase (Inara).
 * Recomendado: gerar automaticamente via `supabase gen types typescript`
 * e substituir este arquivo pelo output gerado.
 */

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
export type TransactionType = "collective" | "individual";
export type ShoppingItemStatus = "pending" | "purchased";

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  telegram_id: number | null;
  xp_total: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  seq_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  created_by: string;
  xp_reward: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  paid_by: string;
  beneficiary_id: string | null;
  category: string | null;
  receipt_url: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  item_name: string;
  quantity: string;
  category: string | null;
  status: ShoppingItemStatus;
  added_by: string;
  purchased_by: string | null;
  purchased_at: string | null;
  estimated_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Tipo genérico do banco para uso com o cliente tipado
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at" | "updated_at">; Update: Partial<Profile> };
      tasks: { Row: Task; Insert: Omit<Task, "id" | "seq_id" | "created_at" | "updated_at">; Update: Partial<Task> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, "id" | "created_at" | "updated_at">; Update: Partial<Transaction> };
      shopping_list: { Row: ShoppingItem; Insert: Omit<ShoppingItem, "id" | "created_at" | "updated_at">; Update: Partial<ShoppingItem> };
    };
    Views: {
      balance_summary: {
        Row: {
          id: string;
          username: string;
          total_paid: number;
          fair_share: number;
          balance: number;
        };
      };
    };
    Functions: {
      is_resident: { Args: Record<never, never>; Returns: boolean };
      task_code: { Args: { seq: number }; Returns: string };
    };
    Enums: {
      task_status: TaskStatus;
      transaction_type: TransactionType;
      shopping_item_status: ShoppingItemStatus;
    };
  };
}
