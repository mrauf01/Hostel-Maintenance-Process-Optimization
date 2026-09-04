"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isDemoMode, isSupabaseConfigured } from "@/lib/mode";
import {
  createStudent,
  demoPassword,
  findUserByEmail,
  getStore,
} from "@/lib/demo/store";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    const id = cookies().get(SESSION_COOKIE)?.value;
    if (!id) return null;
    return getStore().profiles.find((p) => p.id === id) ?? null;
  }
  const supabase = createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export async function signInDemo(email: string, password: string) {
  if (password !== demoPassword() && password !== "demo") {
    return { error: "Use password demo123 for prototype accounts." };
  }
  const user = findUserByEmail(email);
  if (!user) return { error: "No demo account with that email." };
  cookies().set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return { ok: true as const, role: user.role };
}

export async function signUpStudent(input: {
  full_name: string;
  email: string;
  password: string;
  hostel_block?: string;
  room_number?: string;
}) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    if (findUserByEmail(input.email)) {
      return { error: "That email is already registered." };
    }
    const p = createStudent(input);
    cookies().set(SESSION_COOKIE, p.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return { ok: true as const };
  }
  const supabase = createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        role: "student",
      },
    },
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function signInSupabase(email: string, password: string) {
  const supabase = createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  const supabase = createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function switchDemoUser(userId: string) {
  if (!isDemoMode() && isSupabaseConfigured()) {
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
