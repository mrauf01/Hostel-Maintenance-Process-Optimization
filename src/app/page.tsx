import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  KeyRound,
  Lightbulb,
  University,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";

const STEPS = [
  { n: "01", title: "Log it", detail: "Student or desk files one form. Photo optional." },
  { n: "02", title: "Triage", detail: "Category and P1–P3 come from the SLA matrix." },
  { n: "03", title: "Dispatch", detail: "Least-busy staff in that trade. 15-minute ack." },
  { n: "04", title: "Fix", detail: "Inspect, parts, or vendor — with a completion photo." },
  { n: "05", title: "Confirm", detail: "Student closes it in-app. No more ‘is it done?’" },
];

const DESKS = [
  { icon: Lightbulb, name: "Electrical" },
  { icon: Droplets, name: "Plumbing" },
  { icon: Wrench, name: "Furniture" },
  { icon: KeyRound, name: "Locks" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <University className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{APP_NAME}</span>
            <span className="block text-xs text-muted-foreground">
              Hostel maintenance
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">Register</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="grid items-center gap-10 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Campus hostel operations
            </p>
            <h1 className="mt-5 text-[2.15rem] font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.12]">
              One desk for every
              <span className="mt-1 block text-primary">hostel complaint.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Log a leak, a lock, or a dead socket once. Staff pick it up in
              fifteen minutes. You follow the ticket until you confirm it is
              actually fixed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Open the desk <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">Create an account</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {DESKS.map((d) => (
                <span
                  key={d.name}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium"
                >
                  <d.icon className="h-3.5 w-3.5 text-primary" />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <aside className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-accent/60 blur-2xl" />
            <div className="rounded-2xl border bg-card p-5 shadow-lg shadow-primary/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    HZL-2026-01402
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Water leak under washbasin
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Block B · Room 214 · Plumbing
                  </p>
                </div>
                <StatusBadge status="assigned" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  P1 – Emergency
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  On Track · 1d 4h left
                </span>
              </div>
              <ol className="mt-5 space-y-3 border-t pt-4">
                {[
                  { t: "Registered", d: "Logged from student portal", on: true },
                  { t: "Assigned", d: "AquaFix desk · least busy", on: true },
                  { t: "In progress", d: "Inspection due", on: false },
                  { t: "Student confirm", d: "After the completion photo", on: false },
                ].map((s) => (
                  <li key={s.t} className="flex gap-3">
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        s.on ? "bg-primary" : "bg-border"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{s.t}</p>
                      <p className="text-xs text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>

        <section className="mt-20 overflow-hidden rounded-2xl border bg-foreground text-primary-foreground">
          <div className="grid sm:grid-cols-2">
            <div className="border-b border-white/10 p-8 sm:border-b-0 sm:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                How it used to work
              </p>
              <p className="mt-3 text-4xl font-semibold tabular-nums">5 days</p>
              <p className="mt-2 max-w-sm text-sm text-white/70">
                Phone the desk, wait, ask again. No ticket, no owner, no idea
                whether anyone had even seen the complaint.
              </p>
            </div>
            <div className="bg-primary p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
                The target on this desk
              </p>
              <p className="mt-3 text-4xl font-semibold tabular-nums">2 days</p>
              <p className="mt-2 max-w-sm text-sm text-primary-foreground/80">
                Every ticket carries an SLA. At Risk and Breached show up for
                Admin before the weekend is lost.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <p className="text-sm font-semibold text-primary">From log to close</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            The ticket does not disappear into a register.
          </h2>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-card p-5">
                <span className="font-mono text-xs text-primary">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {s.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-sm font-semibold text-primary">Who uses it</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Same portal. Different queues.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Register with the role you actually do. Admin activates the
              account before the dashboard unlocks.
            </p>
          </div>
          <ul className="divide-y rounded-2xl border bg-card">
            {[
              {
                role: "Student",
                line: "File a complaint, flag urgent, confirm the fix.",
              },
              {
                role: "Trade desks",
                line: "Electrical, plumbing, furniture, locks, and walk-in logging.",
              },
              {
                role: "Student Coordinator",
                line: "Grievance queue for urgent and escalated tickets.",
              },
              {
                role: "Admin",
                line: "All tickets, SLA edits, staff, vendors, and KPIs.",
              },
            ].map((r) => (
              <li
                key={r.role}
                className="flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="text-sm font-semibold">{r.role}</span>
                <span className="text-sm text-muted-foreground sm:text-right">
                  {r.line}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 rounded-2xl border bg-card px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to log the first ticket?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Sign in if you already have an account. New staff and students wait
            for Admin approval.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">Register</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
