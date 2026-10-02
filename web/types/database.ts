export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
export type TransactionType = "collective" | "individual";
export type ShoppingItemStatus = "pending" | "purchased";

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  telegram_id: number | null;
  is_admin: boolean;
  theme_preference: string;
  personal_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  seq_id: number;
  title: string;
  description: string | null;
  emoji: string | null;
  recurrence: "none" | "daily" | "weekly";
  status: TaskStatus;
  assignee_id: string | null;
  created_by: string;
  weight: number;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  is_archived: boolean;
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

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  is_all_day: boolean;
  type: "event" | "holiday";
  created_by: string | null;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  idle_time_min: number;
  house_address: string | null;
  house_rules: string | null;
  updated_at: string;
}

export interface Mural {
  id: string;
  message: string;
  created_by: string | null;
  created_at: string;
}

export interface DailyJournal {
  id: string;
  content: string;
  created_at: string;
}

export interface CustomRoutine {
  id: string;
  name: string;
  command: string;
  schedule_cron: string;
  is_active: boolean;
  last_run: string | null;
  created_at: string;
}

export interface KnowledgeBaseDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by: string | null;
  created_at: string;
}

export interface SystemHealthEntry {
  id: string;
  service_name: string;
  status: string;
  last_check: string;
  details: Record<string, any>;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at" | "updated_at">; Update: Partial<Profile> };
      tasks: { Row: Task; Insert: Omit<Task, "id" | "seq_id" | "created_at" | "updated_at">; Update: Partial<Task> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, "id" | "created_at" | "updated_at">; Update: Partial<Transaction> };
      shopping_list: { Row: ShoppingItem; Insert: Omit<ShoppingItem, "id" | "created_at" | "updated_at">; Update: Partial<ShoppingItem> };
      events: { Row: Event; Insert: Omit<Event, "id" | "created_at">; Update: Partial<Event> };
      system_settings: { Row: SystemSettings; Insert: Omit<SystemSettings, "updated_at">; Update: Partial<SystemSettings> };
      mural: { Row: Mural; Insert: Omit<Mural, "id" | "created_at">; Update: Partial<Mural> };
      daily_journal: { Row: DailyJournal; Insert: Omit<DailyJournal, "id" | "created_at">; Update: Partial<DailyJournal> };
      custom_routines: { Row: CustomRoutine; Insert: Omit<CustomRoutine, "id" | "created_at">; Update: Partial<CustomRoutine> };
      knowledge_base: { Row: KnowledgeBaseDoc; Insert: Omit<KnowledgeBaseDoc, "id" | "created_at">; Update: Partial<KnowledgeBaseDoc> };
      system_health: { Row: SystemHealthEntry; Insert: Omit<SystemHealthEntry, "id">; Update: Partial<SystemHealthEntry> };
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
  };
}