import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import { createAdminClient } from "@/lib/supabase/admin";

export type TableCheck = {
  ok: boolean;
  error: string | null;
  rows: number | null;
};

export type DbHealth = {
  mode: "demo" | "live";
  supabaseUrl: boolean;
  anonKey: boolean;
  serviceRole: boolean;
  tables: Record<string, TableCheck>;
  approvedColumn: boolean;
  ok: boolean;
  hint: string;
};

async function probe(
  name: string
): Promise<TableCheck> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Service role key is missing on the server.", rows: null };
  }
  const { data, error, count } = await admin
    .from(name)
    .select("*", { count: "exact", head: true });
  void data;
  if (error) {
    return { ok: false, error: error.message, rows: null };
  }
  return { ok: true, error: null, rows: count ?? 0 };
}

export async function checkDatabase(): Promise<DbHealth> {
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (isDemoMode()) {
    return {
      mode: "demo",
      supabaseUrl,
      anonKey,
      serviceRole,
      tables: {},
      approvedColumn: true,
      ok: true,
      hint: "Demo mode is on. Tickets are stored in a local JSON file, not Postgres.",
    };
  }

  const names = [
    "profiles",
    "complaints",
    "sla_rules",
    "vendors",
    "complaint_events",
    "notifications",
  ];
  const tables: Record<string, TableCheck> = {};
  for (const n of names) {
    tables[n] = await probe(n);
  }

  let approvedColumn = false;
  const admin = createAdminClient();
  if (admin && tables.profiles?.ok) {
    const { data, error } = await admin.from("profiles").select("approved").limit(1);
    approvedColumn = !error;
    void data;
  }

  const missingTables = Object.entries(tables)
    .filter(([, v]) => !v.ok)
    .map(([k, v]) => `${k}: ${v.error}`);

  let hint = "Postgres is reachable and the app schema looks complete.";
  let ok = missingTables.length === 0 && serviceRole && isSupabaseConfigured();

  if (!isSupabaseConfigured()) {
    ok = false;
    hint =
      "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing on the host (Vercel env).";
  } else if (!serviceRole) {
    ok = false;
    hint =
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add the legacy service_role key (Settings → API) in Vercel and redeploy.";
  } else if (missingTables.length) {
    ok = false;
    const first = missingTables[0] ?? "";
    if (/could not find the table|schema cache|does not exist/i.test(first)) {
      hint =
        "Tables are missing. In Supabase SQL Editor run supabase/migrations/0001_init.sql, then 0002_storage.sql, then FIX_DATABASE.sql.";
    } else if (/approved/i.test(first)) {
      hint =
        "The profiles.approved column is missing. Run supabase/FIX_DATABASE.sql in the SQL Editor.";
    } else if (/recursion/i.test(first)) {
      hint =
        "Row Level Security policies are recursive. Run supabase/FIX_DATABASE.sql in the SQL Editor.";
    } else {
      hint = `Database query failed: ${first}`;
    }
  } else if (!approvedColumn) {
    ok = false;
    hint =
      "profiles.approved is missing, so signup/approval queries fail. Run supabase/FIX_DATABASE.sql.";
  }

  return {
    mode: "live",
    supabaseUrl,
    anonKey,
    serviceRole,
    tables,
    approvedColumn,
    ok,
    hint,
  };
}
