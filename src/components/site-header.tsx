import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  let email: string | null = null;
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    isAdmin = user?.app_metadata?.role === "admin";
  } else {
    // Demo mode: show all nav so every page is reachable while building.
    email = "demo@pixl.ph";
    isAdmin = true;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {email ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm" className="text-neon-purple">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <SignOutButton />
            </>
          ) : (
            <Button asChild size="sm" className="glow-cyan font-semibold">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
