"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { toast } from "sonner";
import { signInDemo, signInSupabase } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";

const DEMO = [
  { email: "student@hostel.edu", label: "Student — Aisha" },
  { email: "electrical@hostel.edu", label: "Staff — Electrical" },
  { email: "plumbing@hostel.edu", label: "Staff — Plumbing" },
  { email: "furniture@hostel.edu", label: "Staff — Furniture" },
  { email: "locks@hostel.edu", label: "Staff — Locks" },
  { email: "desk@hostel.edu", label: "Registration desk" },
  { email: "sc@hostel.edu", label: "Student Coordinator" },
  { email: "admin@hostel.edu", label: "Admin / Chief Warden" },
];

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  const [email, setEmail] = useState(demo ? "student@hostel.edu" : "");
  const [password, setPassword] = useState(demo ? "demo123" : "");
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{APP_NAME} portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {demo
            ? "Demo portal — pick an account below or sign in with demo123."
            : "Sign in with the hostel account created in Supabase Auth."}
        </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = demo
              ? await signInDemo(email, password)
              : await signInSupabase(email, password);
            if ("error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success("Signed in");
            router.push(next);
            router.refresh();
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {demo && (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Demo accounts · password demo123
          </p>
          <ul className="mt-2 grid gap-1">
            {DEMO.map((d) => (
              <li key={d.email}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-secondary"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("demo123");
                  }}
                >
                  {d.label}
                  <span className="block font-mono text-xs text-muted-foreground">
                    {d.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-6 text-center text-sm">
        New student?{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
