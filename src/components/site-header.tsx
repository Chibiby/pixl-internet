import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSessionInfo } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const { email, role } = await getSessionInfo();

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
              {role === "admin" && (
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
