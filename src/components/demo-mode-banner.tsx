import { TriangleAlert } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Guardrail against accidentally shipping demo mode: renders a persistent
 * banner whenever Supabase env vars are placeholders, and logs loudly if
 * that happens in a production build.
 */
export function DemoModeBanner() {
  if (isSupabaseConfigured()) return null;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[PIXL] DEMO MODE in a production build: Supabase env vars are missing or placeholders. " +
        "Dashboards show seed data and auth is bypassed. Set NEXT_PUBLIC_SUPABASE_URL / " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY to go live.",
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-center text-xs font-medium text-amber-300">
      <TriangleAlert className="size-3.5 shrink-0" />
      Demo mode — Supabase isn&apos;t configured. Data is sample data and sign-in is
      bypassed.
    </div>
  );
}
