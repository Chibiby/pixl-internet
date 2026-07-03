import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getClientById, getPaymentById } from "@/lib/data";
import { formatDateTime, formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentById(id);
  if (!payment || payment.status !== "paid") notFound();
  const client = await getClientById(payment.client_id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8">
        <Card className="neon-card w-full glow-green border-neon-green/30">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-neon-green" />
            <CardTitle className="text-xl">Payment received</CardTitle>
            <CardDescription>PIXL Internet Service — official receipt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-lg font-bold text-neon-green">
                {formatPeso(payment.amount)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid by</span>
              <span>{client?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDateTime(payment.paid_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="uppercase">{payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{payment.paymongo_ref ?? payment.id}</span>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
