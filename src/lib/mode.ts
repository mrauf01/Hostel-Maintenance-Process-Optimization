export function isDemoMode(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
