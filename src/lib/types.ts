export type ClientStatus = "active" | "suspended";
export type PaymentStatus = "paid" | "pending" | "failed";
export type PaymentMethod = "gcash" | "qrph" | "card" | "cash" | "other";

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
}

export interface Client {
  id: string;
  user_id: string | null;
  full_name: string;
  pppoe_username: string;
  plan_id: string | null;
  status: ClientStatus;
  balance: number;
  due_date: string; // ISO date
  plan?: Plan | null;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymongo_ref: string | null;
  paid_at: string | null;
}

export interface UsageRow {
  id: string;
  client_id: string;
  date: string; // ISO date
  download_mb: number;
  upload_mb: number;
}

/** Display status: overdue is derived, not stored. */
export type DisplayStatus = "active" | "suspended" | "overdue";

export function deriveStatus(client: Pick<Client, "status" | "due_date" | "balance">): DisplayStatus {
  if (client.status === "suspended") return "suspended";
  const due = new Date(client.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (client.balance > 0 && due < today) return "overdue";
  return "active";
}
