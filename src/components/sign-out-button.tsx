"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    if (isSupabaseConfigured()) {
      await createClient().auth.signOut();
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
