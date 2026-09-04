import Link from "next/link";
import { ArrowRight, Clock, Gauge, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_FULL_NAME } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-semibold">{APP_FULL_NAME}</span>
        <Button asChild variant="outline">
          <Link href="/login">ERP Portal login</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Hostel Maintenance Process Optimization
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Cut resolution lead time from five days to two — with one complaint
          portal.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Students log issues once. Staff acknowledge within 15 minutes. SLA
          badges show On Track / At Risk / Breached. Students confirm closure
          in-app. Admin watches the KPI dashboard live.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Open the portal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Student signup</Link>
          </Button>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Clock,
              title: "SLA on every ticket",
              body: "P1 / P2 / P3 targets live in sla_rules — Admin can edit them, they are not hardcoded.",
            },
            {
              icon: ShieldCheck,
              title: "Full lifecycle",
              body: "Intake → triage → dispatch → inspect → parts or resolve → photo → student confirm.",
            },
            {
              icon: Gauge,
              title: "Deliverable 3 KPIs",
              body: "Lead time, SLA miss rate, closure rate, dispatch time, backlog by trade.",
            },
          ].map((f) => (
            <li key={f.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
