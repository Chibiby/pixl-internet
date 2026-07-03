import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/env";

export type RouterAction = "enable" | "disable";

export interface EnqueueResult {
  ok: boolean;
  message: string;
}

/**
 * Queues a PPPoE enable/disable command in the `commands` table. The MikroTik
 * router drains the queue via the router-sync Supabase Edge Function (polling
 * over outbound HTTPS — no VPS needed, works behind CGNAT).
 *
 * Pass an authenticated server client for admin actions (RLS allows admins to
 * insert) or the service-role client for trusted paths like the PayMongo
 * webhook.
 */
export async function enqueueRouterCommand(
  supabase: SupabaseClient,
  opts: { clientId: string; pppoeUsername: string; action: RouterAction },
): Promise<EnqueueResult> {
  if (!isSupabaseConfigured()) {
    console.info(
      `[commands stub] would queue ${opts.action} for "${opts.pppoeUsername}" (demo mode)`,
    );
    return {
      ok: true,
      message: `Demo mode: would queue ${opts.action} for ${opts.pppoeUsername}`,
    };
  }

  const { error } = await supabase.from("commands").insert({
    client_id: opts.clientId,
    pppoe_user: opts.pppoeUsername,
    action: opts.action,
  });

  if (error) {
    return { ok: false, message: `Could not queue command: ${error.message}` };
  }
  return {
    ok: true,
    message: `Queued ${opts.action} for ${opts.pppoeUsername} — the router applies it within ~60s`,
  };
}
