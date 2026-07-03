// PIXL router-sync Edge Function
//
// The MikroTik router (RouterOS v7, see router/pixl-sync.rsc) polls this
// function over outbound HTTPS — no VPS, works behind CGNAT. Endpoints:
//
//   GET/POST /router-sync/pull     → { "commands": [{ "id", "pppoeUser", "action" }] }
//   POST     /router-sync/confirm  ← { "id": "...", "result": "ok" | "fail" }
//   POST     /router-sync/report   ← { "pppoeUser": "...", "download_mb": 123,
//                                      "upload_mb": 45, "status": "active" }
//
// Auth: the router sends `Authorization: Bearer <ROUTER_SECRET>`. The service
// role key stays inside this function and is never exposed to the router.
// JSON stays flat on purpose — RouterOS :deserialize struggles with nesting.
//
// Deploy with JWT verification disabled (router auth is the shared secret):
//   supabase functions deploy router-sync --no-verify-jwt
//   supabase secrets set ROUTER_SECRET=<long random string>

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get("ROUTER_SECRET") ?? "";
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && timingSafeEqual(token, secret);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Queue `disable` for active clients whose balance is overdue. */
async function enqueueOverdueDisables(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdue } = await supabase
    .from("clients")
    .select("id, pppoe_username")
    .eq("status", "active")
    .gt("balance", 0)
    .lt("due_date", today);
  if (!overdue || overdue.length === 0) return;

  const ids = overdue.map((c) => c.id);
  const { data: existing } = await supabase
    .from("commands")
    .select("client_id")
    .in("client_id", ids)
    .eq("action", "disable")
    .in("status", ["pending", "sent"]);
  const alreadyQueued = new Set((existing ?? []).map((c) => c.client_id));

  const rows = overdue
    .filter((c) => !alreadyQueued.has(c.id))
    .map((c) => ({
      client_id: c.id,
      pppoe_user: c.pppoe_username,
      action: "disable",
    }));
  if (rows.length > 0) await supabase.from("commands").insert(rows);
}

async function handlePull(): Promise<Response> {
  await enqueueOverdueDisables();

  const { data: pending, error } = await supabase
    .from("commands")
    .select("id, pppoe_user, action")
    .eq("status", "pending")
    .order("created_at")
    .limit(20);
  if (error) return json({ error: error.message }, 500);

  const commands = pending ?? [];
  if (commands.length > 0) {
    await supabase
      .from("commands")
      .update({ status: "sent" })
      .in("id", commands.map((c) => c.id));
  }

  return json({
    commands: commands.map((c) => ({
      id: c.id,
      pppoeUser: c.pppoe_user,
      action: c.action,
    })),
  });
}

async function handleConfirm(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const result = body?.result as string | undefined;
  if (!id || (result !== "ok" && result !== "fail")) {
    return json({ error: 'Expected { "id": "...", "result": "ok" | "fail" }' }, 400);
  }

  const status = result === "ok" ? "acknowledged" : "failed";
  const { data: command, error } = await supabase
    .from("commands")
    .update({ status })
    .eq("id", id)
    .select("client_id, action")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!command) return json({ error: "Command not found" }, 404);

  // The router actually applied it — reflect the connection state in billing.
  if (result === "ok" && command.client_id) {
    await supabase
      .from("clients")
      .update({ status: command.action === "enable" ? "active" : "suspended" })
      .eq("id", command.client_id);
  }

  return json({ ok: true });
}

async function handleReport(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const pppoeUser = body?.pppoeUser as string | undefined;
  if (!pppoeUser) {
    return json({ error: 'Expected { "pppoeUser": "...", ... }' }, 400);
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("pppoe_username", pppoeUser)
    .maybeSingle();
  if (!client) return json({ error: "Unknown pppoeUser" }, 404);

  const downloadMb = Math.max(0, Math.round(Number(body?.download_mb) || 0));
  const uploadMb = Math.max(0, Math.round(Number(body?.upload_mb) || 0));
  const today = new Date().toISOString().slice(0, 10);

  // Router counters are cumulative per session; the latest report wins for today.
  const { error } = await supabase.from("usage").upsert(
    {
      client_id: client.id,
      date: today,
      download_mb: downloadMb,
      upload_mb: uploadMb,
    },
    { onConflict: "client_id,date" },
  );
  if (error) return json({ error: error.message }, 500);

  const status = body?.status as string | undefined;
  if (status === "active" || status === "suspended") {
    await supabase.from("clients").update({ status }).eq("id", client.id);
  }

  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const path = new URL(req.url).pathname;
  if (path.endsWith("/pull")) return handlePull();
  if (path.endsWith("/confirm") && req.method === "POST") return handleConfirm(req);
  if (path.endsWith("/report") && req.method === "POST") return handleReport(req);

  return json({ error: "Not found. Use /pull, /confirm, or /report" }, 404);
});
