import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { enqueueRouterCommand } from "@/lib/commands";
import type { PaymentMethod } from "@/lib/types";

function detectMethod(sessionAttributes: Record<string, unknown>): PaymentMethod {
  const payments = sessionAttributes?.payments as
    | Array<{ attributes?: { source?: { type?: string } } }>
    | undefined;
  const type = payments?.[0]?.attributes?.source?.type ?? "";
  if (type === "gcash") return "gcash";
  if (type === "qrph") return "qrph";
  if (type === "card") return "card";
  return "other";
}

/** Advance the due date one month forward from whichever is later: due date or today. */
function nextDueDate(current: string): string {
  const base = new Date(current);
  const today = new Date();
  const from = base > today ? base : today;
  from.setMonth(from.getMonth() + 1);
  return from.toISOString().slice(0, 10);
}

/**
 * PayMongo webhook. On checkout_session.payment.paid:
 * verify signature → mark payment paid → settle balance, set client Active,
 * advance due date → queue an `enable` command that the MikroTik router
 * picks up through the router-sync Edge Function.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    // Nothing to settle against in demo mode; acknowledge so PayMongo stops retrying.
    return NextResponse.json({ received: true, demo: true });
  }

  let event: {
    data?: {
      attributes?: {
        type?: string;
        data?: { id?: string; attributes?: Record<string, unknown> };
      };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.data?.attributes?.type;
  const resource = event.data?.attributes?.data;

  if (eventType !== "checkout_session.payment.paid" || !resource?.id) {
    // Ignore other events (payment.failed etc. can be added later).
    return NextResponse.json({ received: true, ignored: eventType });
  }

  const admin = createAdminClient();
  const attributes = resource.attributes ?? {};
  const referenceNumber = attributes.reference_number as string | undefined;

  // Find the pending payment by our payment id (reference) or the session id.
  const query = admin.from("payments").select("*");
  const { data: payment } = referenceNumber
    ? await query.eq("id", referenceNumber).maybeSingle()
    : await query.eq("paymongo_ref", resource.id).maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status === "paid") {
    return NextResponse.json({ received: true, alreadyPaid: true });
  }

  await admin
    .from("payments")
    .update({
      status: "paid",
      method: detectMethod(attributes),
      paid_at: new Date().toISOString(),
      paymongo_ref: payment.paymongo_ref ?? resource.id,
    })
    .eq("id", payment.id);

  const { data: client } = await admin
    .from("clients")
    .select("*")
    .eq("id", payment.client_id)
    .maybeSingle();

  if (client) {
    const newBalance = Math.max(0, Number(client.balance) - Number(payment.amount));
    await admin
      .from("clients")
      .update({
        balance: newBalance,
        status: "active",
        due_date: nextDueDate(client.due_date),
      })
      .eq("id", client.id);

    // Queue re-enabling the PPPoE connection for the router's next poll.
    await enqueueRouterCommand(admin, {
      clientId: client.id,
      pppoeUsername: client.pppoe_username,
      action: "enable",
    });
  }

  return NextResponse.json({ received: true });
}
