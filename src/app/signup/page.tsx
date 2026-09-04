"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signUpStudent } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    hostel_block: "B",
    room_number: "",
  });

  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Student signup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff, SC, and Admin accounts are provisioned by the warden office.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await signUpStudent(form);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Welcome — you can log complaints now");
              router.push("/dashboard/student");
              router.refresh();
            });
          }}
        >
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
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
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
                required
                value={form.room_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, room_number: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
