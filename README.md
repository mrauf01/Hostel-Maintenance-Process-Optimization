# Hostel Maintenance Portal

Prototype of the **Hostel Maintenance Process Optimization** project: a single ERP-style portal that takes a complaint from intake through closure, with the explicit goal of cutting resolution lead time from **5 days to 2 days**.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts**. Persistence is **Supabase (Postgres + Auth + RLS + Storage + Realtime)** when credentials are present. Out of the box the app runs in **demo mode** so you can click through every role without creating a cloud project first.

## Run locally

```bash
npm install
cp .env.example .env.local
# leave NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

Open [http://localhost:43147](http://localhost:43147). Demo password for every seeded account: `demo123`.

| Email | Role |
|---|---|
| `student@hostel.edu` | Student (Aisha, Block B214) |
| `student2@hostel.edu` | Second student |
| `electrical@hostel.edu` | Electrical staff |
| `electrical2@hostel.edu` | Second electrician (round-robin / least-busy) |
| `plumbing@hostel.edu` | Plumbing |
| `furniture@hostel.edu` | Furniture / carpentry |
| `locks@hostel.edu` | Locks |
| `desk@hostel.edu` | Registration desk (walk-in / call logging) |
| `sc@hostel.edu` | Student council member |
| `admin@hostel.edu` | Admin (Chief Warden) |

Use **Switch demo role** in the header to hop accounts without signing out.

## Connect Supabase (production)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor → run `supabase/migrations/0001_init.sql`, then `0002_storage.sql`, then `FIX_DATABASE.sql` (adds `approved` and `phone`, repairs recursive RLS, and activates `mrauf1192@gmail.com` as Admin). If the site already talks to Supabase but dashboards fail, **only** `FIX_DATABASE.sql` is required. To add contact numbers on an existing project without re-running the full file, run `supabase/migrations/0006_contact_phone.sql`.
3. Authentication → enable Email provider. Create staff / Student council member / Admin users, then set `profiles.role` (and `category` for staff) or run `supabase/seed_roles.sql`.
4. Put keys in `.env.local` and Vercel env:

```
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

5. Enable Realtime on `complaints`, `complaint_events`, and `notifications` (the first migration attempts to add them to `supabase_realtime`).
6. Redeploy.

Until those env vars are set, keep `NEXT_PUBLIC_DEMO_MODE=true`. Demo writes to `.data/demo-store.json` locally (gitignored).

## Deploy on Vercel

This is a standard Next.js app. Set the same env vars in the Vercel project. The Cursor **Publish** control can create the project; add the Supabase keys in the Vercel dashboard afterwards if you are leaving demo mode.

## Complaint lifecycle (as implemented)

1. **Intake** — `/complaints/new` (student or registration desk). Unique `HMP-YYYY-NNNNN` ticket ID.
2. **Auto-triage** — issue type maps to staff category + P1/P2/P3 from `sla_rules` (keywords such as “leak” / “power failure” / lock issues force P1). Desk can override priority.
3. **Dispatch** — least-busy staff in that category; 15-minute acknowledgement countdown on the ticket.
4. **Inspection** — staff → In Progress.
5. **Resolution branch** — minor: complete with photo; major: Material Requested or Vendor Unavailable (Admin-visible).
6. **Verification** — completion photo → Pending Student Confirmation.
7. **Closure** — student Confirm Resolved / Not Resolved (reopens + notifies staff and Admin). No OTP.
8. **Urgent / escalation** — student Urgent flag → Student council member grievance queue → escalate to Admin → optional Further Escalation with audit timestamp.

SLA status **On Track / At Risk / Breached** is computed from `created_at` + the matching `sla_rules` row (70% of the window = At Risk). Admin edits the matrix on the Admin dashboard (not hardcoded).

## Project deliverable map

| PJM deliverable | Where it lives in this app |
|---|---|
| **1. As-is / to-be process (lifecycle)** | Home page narrative + visual stepper on `/complaints/[ticket_id]` (Registered → Assigned → In Progress → Resolved/Escalated) and the event audit trail |
| **2. SLA design** | `sla_rules` table / Admin **SLA, staff & vendors** tab; badges on every ticket card |
| **3. KPI / monitoring dashboard** | Admin `/dashboard/admin` → **KPI dashboard** (lead time vs 2-day target, % over 2 days, closure within SLA, avg dispatch time, backlog by category). Recharts, date/category filters, clickable legend |
| **4. Single portal (ERP equivalent)** | `/login` + role dashboards under `/dashboard/*` and one intake form |
| **5. Escalation & grievance path** | Student Urgent → `/dashboard/sc` → Escalate to Admin → Further Escalation flag + history |

## Pages

- `/login`, `/signup`
- `/dashboard` — role redirect
- `/dashboard/student` — cards, FAB on mobile
- `/dashboard/staff` — category queue, walk-in logging
- `/dashboard/sc` — Student council member grievance queue
- `/dashboard/admin` — KPIs, all tickets, SLA/staff/vendors
- `/complaints/new`
- `/complaints/[ticket_id]`

## RLS (when using Supabase)

See `supabase/migrations/0001_init.sql` plus `0004_fix_rls_and_approval.sql`. Policies use `my_role()` / `my_category()` so they do not recurse on `profiles`. Students see/insert own tickets and may update to confirm or reopen. Staff see their category / assignments. A Student council member sees `is_urgent` or `status = escalated`. Admin sees everything, including `sla_rules`.

`GET /api/health` reports whether Postgres tables and the service role key are working (no secrets in the response).

## Scripts

```bash
npm run dev    # port 43147
npm run build
npm run start
npm run lint
```
