import Link from "next/link";
import { Zap, Users, Wifi, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlans } from "@/lib/data";
import { formatPeso } from "@/lib/format";

export default async function HomePage() {
  const plans = await getPlans();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <Badge
            variant="outline"
            className="mb-6 border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan uppercase tracking-widest"
          >
            <Wifi className="mr-1 size-3" /> Fiber-shared internet
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold sm:text-6xl">
            <span className="text-glow-cyan text-neon-cyan">Fast fiber</span>{" "}
            for the whole{" "}
            <span className="text-glow-purple text-neon-purple">household</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground sm:text-lg">
            PIXL Internet Service brings affordable shared-fiber connections to
            your barangay. Pay with GCash, track your usage, and stay connected.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full glow-cyan font-bold sm:w-auto">
              <Link href="/login">
                <Zap className="size-4" /> Get connected
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">Client portal</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            Choose your <span className="text-neon-green text-glow-green">plan</span>
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {plans.map((plan, i) => {
              const pro = i === plans.length - 1;
              return (
                <Card
                  key={plan.id}
                  className={
                    pro
                      ? "neon-card glow-purple border-neon-purple/40"
                      : "neon-card glow-cyan border-neon-cyan/30"
                  }
                >
                  <CardHeader>
                    <CardTitle
                      className={`font-heading tracking-widest ${
                        pro ? "text-neon-purple" : "text-neon-cyan"
                      }`}
                    >
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <Users className="size-3.5" /> {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-extrabold">
                      {formatPeso(plan.monthly_price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-neon-green" />
                        Shared fiber connection
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-neon-green" />
                        GCash &amp; QR Ph payments
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-neon-green" />
                        Usage dashboard access
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className={`w-full font-semibold ${pro ? "glow-purple" : "glow-cyan"}`}
                      variant={pro ? "default" : "secondary"}
                    >
                      <Link href="/login">Sign up for {plan.name}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PIXL Internet Service · Philippines
      </footer>
    </div>
  );
}
