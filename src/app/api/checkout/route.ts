import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createCheckoutSession, isPayMongoConfigured } from "@/lib/paymongo";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Starts a PayMongo Hosted Checkout for the signed-in client's balance.
 * Creates a pending payment row keyed to the checkout session so the webhook
 * can settle it later.
 */
export async function POST(request: Request) {
  const { clientId } = await request.json().catch(() => ({}));
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  // Demo mode: simulate the redirect flow against seeded data.
  if (!isSupabaseConfigured() || !isPayMongoConfigured()) {
    return NextResponse.json({
      checkoutUrl: "/payment/return?ref=cs_demo_001",
      demo: true,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // RLS guarantees users can only read their own client row.
  const { data: client } = await supabase
    .from("clients")
    .select("*, plan:plans(*)")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (Number(client.balance) <= 0) {
    return NextResponse.json({ error: "Nothing due — balance is settled" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      client_id: client.id,
      amount: client.balance,
      method: "gcash",
      status: "pending",
    })
    .select()
    .single();
  if (insertError || !payment) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not create payment" },
      { status: 500 },
    );
  }

  try {
    const session = await createCheckoutSession({
      amount: Number(client.balance),
      description: `${client.plan?.name ?? "PIXL"} — monthly bill (${client.pppoe_username})`,
      referenceNumber: payment.id,
      successUrl: `${siteUrl()}/payment/return?pid=${payment.id}`,
      cancelUrl: `${siteUrl()}/dashboard`,
    });

    // Store the session id so the webhook can find this payment.
    await admin
      .from("payments")
      .update({ paymongo_ref: session.id })
      .eq("id", payment.id);

    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (err) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
