"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { enqueueRouterCommand, type RouterAction } from "@/lib/commands";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const DEMO_MSG =
  "Demo mode: connect Supabase (.env.local) to persist changes.";

export interface ClientInput {
  id?: string;
  full_name: string;
  pppoe_username: string;
  plan_id: string | null;
  status: "active" | "suspended";
  balance: number;
  due_date: string;
}

export async function saveClient(input: ClientInput): Promise<ActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured()) return { ok: false, message: DEMO_MSG };

  const supabase = await createClient();
  const row = {
    full_name: input.full_name.trim(),
    pppoe_username: input.pppoe_username.trim(),
    plan_id: input.plan_id || null,
    status: input.status,
    balance: input.balance,
    due_date: input.due_date,
  };

  const { error } = input.id
    ? await supabase.from("clients").update(row).eq("id", input.id)
    : await supabase.from("clients").insert(row);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: input.id ? "Client updated" : "Client added" };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured()) return { ok: false, message: DEMO_MSG };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Client removed" };
}

/**
 * Enable/disable a client's PPPoE connection: updates status in the DB and
 * queues the command for the MikroTik router, which polls the router-sync
 * Edge Function every ~60 seconds.
 */
export async function toggleConnection(
  clientId: string,
  pppoeUsername: string,
  action: RouterAction,
): Promise<ActionResult> {
  await requireAdmin();

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message: `Demo mode: would queue ${action} for ${pppoeUsername}`,
    };
  }

  const supabase = await createClient();

  const queued = await enqueueRouterCommand(supabase, {
    clientId,
    pppoeUsername,
    action,
  });
  if (!queued.ok) return queued;

  const { error } = await supabase
    .from("clients")
    .update({ status: action === "enable" ? "active" : "suspended" })
    .eq("id", clientId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin");
  return { ok: true, message: queued.message };
}
