"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signUpAccount } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIGNUP_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState("student");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    hostel_block: "B",
    room_number: "",
  });
  const selected = SIGNUP_ROLES.find((r) => r.id === kind)!;
  const isStudent = selected.role === "student";

  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anyone can register. The Chief Warden must approve the account
          before login access is activated. Admin cannot self-register.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await signUpAccount({
                ...form,
                role: selected.role,
                category: selected.category,
              });
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Registered — waiting for Admin approval");
              router.push("/pending");
              router.refresh();
            });
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Who are you?</legend>
            <div className="grid grid-cols-2 gap-2">
              {SIGNUP_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setKind(r.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 hover:border-primary/40",
                    kind === r.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "bg-card"
                  )}
                >
                  <span className="font-semibold">{r.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {r.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Contact number</Label>
            <Input
              id="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="10–15 digits, with country code if needed"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          {isStudent && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="block">Block</Label>
                <Input
                  id="block"
                  value={form.hostel_block}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hostel_block: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={form.room_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, room_number: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? "Submitting…" : "Submit for approval"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          Already approved?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
