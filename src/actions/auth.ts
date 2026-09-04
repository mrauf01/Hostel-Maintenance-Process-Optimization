"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import {
  checkDemoPassword,
  createAccount,
  findUserByEmail,
  getStore,
  setApproved,
} from "@/lib/demo/store";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, StaffCategory, UserRole } from "@/lib/types";

function live() {
  return !isDemoMode() && isSupabaseConfigured();
}

export async function getCurrentProfile(): Promise<Profile | null> {
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
  const { data } = await reader
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (data) {
    const p = data as Profile;
    return { ...p, approved: p.approved !== false };
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
    await admin.from("profiles").upsert(created);
    return created;
  }
  return null;
}

export async function signIn(email: string, password: string) {
  if (!live()) {
    if (!checkDemoPassword(email, password)) {
      return { error: "Wrong email or password." };
    }
    const user = findUserByEmail(email);
    if (!user) return { error: "No account with that email." };
    cookies().set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    const approved = user.approved !== false;
    return {
      ok: true as const,
      role: user.role,
      approved,
    };
  }
  const supabase = createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };
  if (data.user) {
    cookies().set(SESSION_COOKIE, data.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  const profile = await getCurrentProfile();
  return {
    ok: true as const,
    role: profile?.role ?? "student",
    approved: profile?.approved !== false && Boolean(profile),
  };
}

export async function signUpAccount(input: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  category: StaffCategory | null;
  hostel_block?: string;
  room_number?: string;
}) {
  if (input.role === "admin") {
    return { error: "Admin accounts are created by the Chief Warden only." };
  }
  if (!input.full_name.trim()) return { error: "Enter your full name." };
  if (input.password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (!live()) {
    if (findUserByEmail(input.email)) {
      return { error: "That email is already registered." };
    }
    const p = createAccount(input);
    cookies().set(SESSION_COOKIE, p.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return { ok: true as const, pending: true as const };
  }

  const supabase = createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        role: input.role,
        category: input.category,
        hostel_block: input.hostel_block,
        room_number: input.room_number,
      },
    },
  });
  if (error) return { error: error.message };
  const admin = createAdminClient();
  if (admin && data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      category: input.category,
      hostel_block: input.hostel_block ?? null,
      room_number: input.room_number ?? null,
      approved: false,
    });
    cookies().set(SESSION_COOKIE, data.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return { ok: true as const, pending: true as const };
}

export async function listPendingAccounts(): Promise<Profile[]> {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return [];
  if (!live()) {
    return getStore().profiles.filter((p) => p.approved === false);
  }
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("*").eq("approved", false);
  return (data ?? []) as Profile[];
}

export async function setAccountApproval(id: string, approved: boolean) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return { error: "Admin only." };
  if (!live()) {
    setApproved(id, approved);
    revalidatePath("/dashboard/admin");
    return { ok: true as const };
  }
  const admin = createAdminClient();
  if (!admin) return { error: "Supabase service role missing." };
  const { error } = await admin.from("profiles").update({ approved }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { ok: true as const };
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  const supabase = createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function switchDemoUser(userId: string) {
  if (live()) {
    return { error: "Role switch is only available in demo mode." };
  }
  const p = getStore().profiles.find((x) => x.id === userId);
  if (!p) return { error: "Unknown user" };
  cookies().set(SESSION_COOKIE, p.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return { ok: true as const, role: p.role };
}
