import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import { getStore } from "@/lib/demo/store";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, StaffCategory, UserRole } from "@/lib/types";

function live() {
  return !isDemoMode() && isSupabaseConfigured();
}

/** One profile read per request — layout, page, and AppShell share this. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!live()) {
    const id = cookies().get(SESSION_COOKIE)?.value;
    if (!id) return null;
    const p = getStore().profiles.find((x) => x.id === id) ?? null;
    return p ? { ...p, approved: p.approved !== false } : null;
  }
  const supabase = createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookies().get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const admin = createAdminClient();
  const reader = admin ?? supabase;
  const { data, error } = await reader
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[profiles]", error.message);
  }
  if (data) {
    const p = data as Profile;
    const approved = p.role === "admin" ? true : p.approved !== false;
    return { ...p, approved };
  }

  if (admin && user?.email) {
    const created: Profile = {
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string) ||
        user.email.split("@")[0],
      email: user.email,
      role: (user.user_metadata?.role as UserRole) || "student",
      category: (user.user_metadata?.category as StaffCategory) || null,
      hostel_block: (user.user_metadata?.hostel_block as string) || null,
      room_number: (user.user_metadata?.room_number as string) || null,
      created_at: new Date().toISOString(),
      approved: false,
    };
    const first = await admin.from("profiles").upsert(created);
    if (first.error && /approved/i.test(first.error.message)) {
      const { approved: _a, ...withoutApproved } = created;
      void _a;
      await admin.from("profiles").upsert(withoutApproved);
    }
    return { ...created, approved: created.role === "admin" };
  }
  return null;
});
