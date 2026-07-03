"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";

export function PayNowButton({
  clientId,
  amount,
}: {
  clientId: string;
  amount: number;
}) {
  const [loading, setLoading] = useState(false);

  async function payNow() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      onClick={payNow}
      disabled={loading || amount <= 0}
      className="w-full glow-cyan bg-neon-cyan font-heading text-base font-bold tracking-wider text-primary-foreground hover:bg-neon-cyan/90 sm:w-auto"
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
      {amount > 0 ? `Pay now · ${formatPeso(amount)}` : "Nothing due"}
    </Button>
  );
}
