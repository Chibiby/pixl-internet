import "server-only";

import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";

export type Role = "client" | "admin";

export interface SessionInfo {
  userId: string | null;
  email: string | null;
  role: Role | null;
}

/** Current session + role from the profiles table. Demo mode acts as admin. */
export async function getSessionInfo(): Promise<SessionInfo> {
  if (!isSupabaseConfigured()) {
    return { userId: "demo-user", email: "demo@pixl.ph", role: "admin" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, role: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? "client",
  };
}

export async function requireAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo();
  if (session.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}
