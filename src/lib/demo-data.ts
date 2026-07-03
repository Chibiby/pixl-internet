import type { Client, Payment, Plan, UsageRow } from "./types";

/**
 * In-memory demo data used whenever Supabase env vars are not configured,
 * so both dashboards render immediately after cloning. Mirrors supabase/seed.sql.
 */

export const demoPlans: Plan[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "PIXL BASIC",
    description: "For households of 4–10 users",
    monthly_price: 500,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "PIXL PRO",
    description: "For households of 10+ users",
    monthly_price: 800,
  },
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const demoClients: Client[] = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    user_id: null,
    full_name: "Juan Dela Cruz",
    pppoe_username: "pixl-juandc",
    plan_id: demoPlans[0].id,
    status: "active",
    balance: 0,
    due_date: daysFromNow(12),
    plan: demoPlans[0],
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    user_id: null,
    full_name: "Maria Santos",
    pppoe_username: "pixl-msantos",
    plan_id: demoPlans[1].id,
    status: "active",
    balance: 800,
    due_date: daysFromNow(5),
    plan: demoPlans[1],
  },
  {
    id: "c1000000-0000-0000-0000-000000000003",
    user_id: null,
    full_name: "Pedro Reyes",
    pppoe_username: "pixl-preyes",
    plan_id: demoPlans[0].id,
    status: "active",
    balance: 500,
    due_date: daysFromNow(-6),
    plan: demoPlans[0],
  },
  {
    id: "c1000000-0000-0000-0000-000000000004",
    user_id: null,
    full_name: "Ana Villanueva",
    pppoe_username: "pixl-avilla",
    plan_id: demoPlans[1].id,
    status: "suspended",
    balance: 1600,
    due_date: daysFromNow(-35),
    plan: demoPlans[1],
  },
  {
    id: "c1000000-0000-0000-0000-000000000005",
    user_id: null,
    full_name: "Carlo Mendoza",
    pppoe_username: "pixl-cmendoza",
    plan_id: demoPlans[0].id,
    status: "active",
    balance: 0,
    due_date: daysFromNow(20),
    plan: demoPlans[0],
  },
];

export const demoPayments: Payment[] = [
  {
    id: "p1000000-0000-0000-0000-000000000001",
    client_id: demoClients[0].id,
    amount: 500,
    method: "gcash",
    status: "paid",
    paymongo_ref: "cs_demo_001",
    paid_at: new Date(Date.now() - 18 * 86400_000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000002",
    client_id: demoClients[0].id,
    amount: 500,
    method: "gcash",
    status: "paid",
    paymongo_ref: "cs_demo_002",
    paid_at: new Date(Date.now() - 48 * 86400_000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000003",
    client_id: demoClients[0].id,
    amount: 500,
    method: "qrph",
    status: "paid",
    paymongo_ref: "cs_demo_003",
    paid_at: new Date(Date.now() - 79 * 86400_000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000004",
    client_id: demoClients[1].id,
    amount: 800,
    method: "gcash",
    status: "pending",
    paymongo_ref: "cs_demo_004",
    paid_at: null,
  },
  {
    id: "p1000000-0000-0000-0000-000000000005",
    client_id: demoClients[2].id,
    amount: 500,
    method: "cash",
    status: "paid",
    paymongo_ref: null,
    paid_at: new Date(Date.now() - 40 * 86400_000).toISOString(),
  },
];

/** 30 days of plausible usage for a client. */
export function demoUsage(clientId: string): UsageRow[] {
  const rows: UsageRow[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Deterministic pseudo-random so charts are stable between renders
    const seed = (i * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    rows.push({
      id: `u-${clientId}-${i}`,
      client_id: clientId,
      date: d.toISOString().slice(0, 10),
      download_mb: Math.round(3000 + rand * 9000 + (weekend ? 4000 : 0)),
      upload_mb: Math.round(600 + rand * 2200 + (weekend ? 800 : 0)),
    });
  }
  return rows;
}
