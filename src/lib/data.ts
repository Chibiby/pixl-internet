import "server-only";

import { demoClients, demoPayments, demoPlans, demoUsage } from "./demo-data";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import { deriveStatus, type Client, type Payment, type Plan, type UsageRow } from "./types";

const CLIENT_SELECT = "*, plan:plans(*)";

export async function getPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured()) return demoPlans;
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("monthly_price");
  return (data as Plan[]) ?? [];
}

/** The client record for the signed-in user; demo mode returns a sample client. */
export async function getClientForUser(userId: string | null): Promise<Client | null> {
  if (!isSupabaseConfigured()) return demoClients[0];
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Client | null) ?? null;
}

export async function getPaymentsForClient(clientId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured()) {
    return demoPayments.filter((p) => p.client_id === clientId);
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("paid_at", { ascending: false, nullsFirst: true });
  return (data as Payment[]) ?? [];
}

export async function getUsageForClient(clientId: string): Promise<UsageRow[]> {
  if (!isSupabaseConfigured()) return demoUsage(clientId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("usage")
    .select("*")
    .eq("client_id", clientId)
    .order("date")
    .limit(90);
  return (data as UsageRow[]) ?? [];
}

export async function getAllClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) return demoClients;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("full_name");
  return (data as Client[]) ?? [];
}

export interface AdminMetrics {
  totalClients: number;
  active: number;
  suspended: number;
  overdue: number;
  monthlyRevenue: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const clients = await getAllClients();

  let monthlyRevenue = 0;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString());
    monthlyRevenue = (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  } else {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthlyRevenue = demoPayments
      .filter((p) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  const statuses = clients.map(deriveStatus);
  return {
    totalClients: clients.length,
    active: statuses.filter((s) => s === "active").length,
    suspended: statuses.filter((s) => s === "suspended").length,
    overdue: statuses.filter((s) => s === "overdue").length,
    monthlyRevenue,
  };
}
