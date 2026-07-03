import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarDays, Router, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { UsageCharts } from "@/components/usage-charts";
import { PayNowButton } from "@/components/pay-now-button";
import { PaymentHistoryTable } from "@/components/payment-history-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getClientForUser,
  getPaymentsForClient,
  getUsageForClient,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatDate, formatPeso } from "@/lib/format";
import { deriveStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  const client = await getClientForUser(userId);

  if (!client) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4">
          <Card className="neon-card w-full text-center">
            <CardHeader>
              <CardTitle>No account linked yet</CardTitle>
              <CardDescription>
                Your login isn&apos;t linked to a PIXL client account. Message us
                to get connected, or check back after we activate your line.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [payments, usage] = await Promise.all([
    getPaymentsForClient(client.id),
    getUsageForClient(client.id),
  ]);
  const status = deriveStatus(client);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Hi, <span className="text-neon-cyan text-glow-cyan">{client.full_name.split(" ")[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s your connection at a glance.
            </p>
          </div>
          <StatusBadge status={status} className="self-start px-3 py-1.5 text-sm sm:self-auto" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Router className="size-3.5" /> Current plan
              </CardDescription>
              <CardTitle className="font-heading text-lg tracking-wider text-neon-purple">
                {client.plan?.name ?? "No plan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {client.plan
                ? `${formatPeso(client.plan.monthly_price)}/month · ${client.plan.description}`
                : "Contact us to pick a plan."}
              <p className="mt-1 font-mono text-xs">PPPoE: {client.pppoe_username}</p>
            </CardContent>
          </Card>

          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Activity className="size-3.5" /> Connection
              </CardDescription>
              <CardTitle className="text-lg">
                <StatusBadge status={status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {status === "active" && "You're online. Enjoy your fiber!"}
              {status === "overdue" && "Payment past due — settle to avoid disconnection."}
              {status === "suspended" && "Connection suspended. Pay your balance to reconnect."}
            </CardContent>
          </Card>

          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Wallet className="size-3.5" /> Balance
              </CardDescription>
              <CardTitle
                className={`text-2xl font-extrabold ${
                  client.balance > 0 ? "text-amber-300" : "text-neon-green text-glow-green"
                }`}
              >
                {formatPeso(client.balance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {client.balance > 0 ? "Outstanding balance" : "All settled — salamat!"}
            </CardContent>
          </Card>

          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Next due date
              </CardDescription>
              <CardTitle className="text-2xl font-extrabold">
                {formatDate(client.due_date)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Monthly billing cycle
            </CardContent>
          </Card>
        </div>

        <Card className="neon-card border-neon-cyan/30">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="text-lg font-bold">Settle your bill in seconds</h2>
              <p className="text-sm text-muted-foreground">
                GCash and QR Ph via secure PayMongo checkout.
              </p>
            </div>
            <PayNowButton clientId={client.id} amount={client.balance} />
          </CardContent>
        </Card>

        <Card className="neon-card">
          <CardHeader>
            <CardTitle className="text-base">Bandwidth usage</CardTitle>
            <CardDescription>Daily and monthly download / upload</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageCharts usage={usage} />
          </CardContent>
        </Card>

        <Card className="neon-card">
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentHistoryTable payments={payments} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
