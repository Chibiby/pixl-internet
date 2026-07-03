"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type OAuthProvider = "google" | "facebook";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#1877F2" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const configured = isSupabaseConfigured();

  function demoGuard(): boolean {
    if (!configured) {
      toast.info("Demo mode: Supabase isn't configured yet — opening the dashboard directly.");
      router.push("/dashboard");
      return true;
    }
    return false;
  }

  async function oauth(provider: OAuthProvider) {
    if (demoGuard()) return;
    setLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(null);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (demoGuard()) return;
    setLoading("signin");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(null);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (demoGuard()) return;
    setLoading("signup");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(null);
      return;
    }
    toast.success("Account created! Check your email to confirm, then sign in.");
    setLoading(null);
  }

  const oauthButtons = (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => oauth("google")}
        disabled={!!loading}
      >
        {loading === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => oauth("facebook")}
        disabled={!!loading}
      >
        {loading === "facebook" ? <Loader2 className="size-4 animate-spin" /> : <FacebookIcon />}
        Continue with Facebook
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Image
          src="/logo.png"
          alt="PIXL Internet Service"
          width={180}
          height={100}
          className="h-24 w-auto rounded-lg"
          priority
        />
      </Link>

      <Card className="neon-card w-full max-w-sm glow-cyan border-neon-cyan/25">
        <CardHeader className="text-center">
          <CardTitle className="font-heading tracking-widest">CLIENT PORTAL</CardTitle>
          <CardDescription>Sign in to manage your PIXL connection</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 space-y-4">
              {oauthButtons}
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <form onSubmit={signIn} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email-in">Email</Label>
                  <Input
                    id="email-in"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pw-in">Password</Label>
                  <Input
                    id="pw-in"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!!loading} className="glow-cyan font-semibold">
                  {loading === "signin" && <Loader2 className="size-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 space-y-4">
              {oauthButtons}
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <form onSubmit={signUp} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="name-up">Full name</Label>
                  <Input
                    id="name-up"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pw-up">Password</Label>
                  <Input
                    id="pw-up"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!!loading} className="glow-purple bg-neon-purple font-semibold hover:bg-neon-purple/90">
                  {loading === "signup" && <Loader2 className="size-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-neon-cyan">
          ← Back to pixl.ph
        </Link>
      </p>
    </div>
  );
}
