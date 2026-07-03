export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True when real Supabase credentials are present. When false the app runs in
 * demo mode: dashboards render seed data and auth is bypassed, so the UI is
 * testable immediately after cloning.
 */
export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl.startsWith("https://") &&
    !supabaseUrl.includes("YOUR_") &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes("YOUR_")
  );
}
