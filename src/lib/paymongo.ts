import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

export function isPayMongoConfigured(): boolean {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  return key.startsWith("sk_") && !key.includes("YOUR_");
}

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export interface CheckoutSession {
  id: string;
  checkoutUrl: string;
}

/**
 * Creates a PayMongo Hosted Checkout session (redirect flow) for GCash / QR Ph.
 * Amounts are in centavos per the PayMongo API.
 */
export async function createCheckoutSession(opts: {
  amount: number; // pesos
  description: string;
  referenceNumber: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              name: opts.description,
              amount: Math.round(opts.amount * 100),
              currency: "PHP",
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "qrph"],
          description: opts.description,
          reference_number: opts.referenceNumber,
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          send_email_receipt: false,
          show_line_items: true,
        },
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail ?? `PayMongo error ${res.status}`;
    throw new Error(detail);
  }

  return {
    id: json.data.id as string,
    checkoutUrl: json.data.attributes.checkout_url as string,
  };
}

/**
 * Verifies the Paymongo-Signature webhook header:
 *   t=<timestamp>,te=<test-mode sig>,li=<live-mode sig>
 * The signature is HMAC-SHA256 of "<timestamp>.<raw body>" keyed with the
 * webhook signing secret.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.li || parts.te;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
