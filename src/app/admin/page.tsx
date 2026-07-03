import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AdminClientTable } from "@/components/admin/client-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminMetrics, getAllClients, getPlans } from "@/lib/data";
import { getSessionInfo } from "@/lib/auth";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { role } = await getSessionInfo();
  if (role !== "admin") redirect("/dashboard");

  const [metrics, clients, plans] = await Promise.all([
    getAdminMetrics(),
    getAllClients(),
    getPlans(),
  ]);

  const cards = [
    {
      label: "Total clients",
      value: String(metrics.totalClients),
      icon: Users,
      accent: "text-neon-cyan",
    },
    {
      label: "Active",
      value: String(metrics.active),
      icon: Wifi,
      accent: "text-neon-green",
    },
    {
      label: "Suspended",
      value: String(metrics.suspended),
      icon: WifiOff,
      accent: "text-destructive",
    },
    {
      label: "Overdue",
      value: String(metrics.overdue),
      icon: AlertTriangle,
      accent: "text-amber-300",
    },
    {
      label: "Revenue this month",
      value: formatPeso(metrics.monthlyRevenue),
      icon: Banknote,
      accent: "text-neon-purple",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">
            Admin <span className="text-neon-purple text-glow-purple">console</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage clients, billing, and connections.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.label} className="neon-card">
              <CardHeader className="pb-1">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <c.icon className={`size-3.5 ${c.accent}`} /> {c.label}
                </CardDescription>
                <CardTitle className={`text-2xl font-extrabold ${c.accent}`}>
                  {c.value}
                </CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>

        <AdminClientTable clients={clients} plans={plans} />
      </main>
    </div>
  );
}
