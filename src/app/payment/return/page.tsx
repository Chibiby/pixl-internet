import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPaymentById, getPaymentByRef } from "@/lib/data";

export const metadata: Metadata = { title: "Payment status" };

/**
 * PayMongo hosted checkout redirects here after payment. The webhook may
 * arrive a few seconds later, so "pending" is a normal transient state.
 */
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; pid?: string }>;
}) {
  const { ref, pid } = await searchParams;
  const payment = pid
    ? await getPaymentById(pid)
    : ref
      ? await getPaymentByRef(ref)
      : null;
  const status = payment?.status ?? "pending";
  const refreshHref = pid
    ? `/payment/return?pid=${pid}`
    : ref
      ? `/payment/return?ref=${ref}`
      : "/payment/return";

  const view =
    status === "paid"
      ? {
          icon: <CheckCircle2 className="mx-auto size-14 text-neon-green" />,
          title: "Payment successful!",
          body: "Salamat! Your payment is confirmed and your connection is active.",
          glow: "glow-green border-neon-green/30",
        }
      : status === "failed"
        ? {
            icon: <XCircle className="mx-auto size-14 text-destructive" />,
            title: "Payment failed",
            body: "Something went wrong with your payment. Please try again from your dashboard.",
            glow: "glow-red border-destructive/30",
          }
        : {
            icon: <Clock3 className="mx-auto size-14 animate-pulse-glow text-amber-300" />,
            title: "Payment processing…",
            body: "We're waiting for PayMongo to confirm your payment. This usually takes a few seconds — refresh to check again.",
            glow: "border-amber-400/30",
          };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4">
        <Card className={`neon-card w-full text-center ${view.glow}`}>
          <CardHeader>
            {view.icon}
            <CardTitle className="text-xl">{view.title}</CardTitle>
            <CardDescription>{view.body}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {status === "pending" && (
              <Button asChild variant="outline">
                <Link href={refreshHref}>Refresh status</Link>
              </Button>
            )}
            <Button asChild className={status === "paid" ? "glow-green" : ""}>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
