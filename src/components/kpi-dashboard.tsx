"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeKpis } from "@/lib/kpis";
import { CATEGORY_LABELS, TARGET_RESOLUTION_DAYS } from "@/lib/constants";
import type { Complaint, ComplaintEvent, StaffCategory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function KpiDashboard({
  complaints,
  events,
}: {
  complaints: Complaint[];
  events: ComplaintEvent[];
}) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("all");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const kpi = useMemo(
    () =>
      computeKpis(complaints, events, {
        from,
        to,
        category: category as StaffCategory | "all",
      }),
    [complaints, events, from, to, category]
  );

  function toggle(name: string) {
    setHidden((h) => ({ ...h, [name]: !h[name] }));
  }

  const cards = [
    {
      label: "Avg resolution lead time",
      value: `${kpi.avgResolutionDays.toFixed(2)} days`,
      hint: `Target ${TARGET_RESOLUTION_DAYS} days`,
    },
    {
      label: "% over 2-day window",
      value: `${kpi.pctOverTwoDays.toFixed(0)}%`,
      hint: "Share of closed tickets slower than 2 days",
    },
    {
      label: "Closure within SLA",
      value: `${kpi.closureWithinSla.toFixed(0)}%`,
      hint: "Vs configured sla_rules",
    },
    {
      label: "Avg dispatch time",
      value: `${kpi.avgAssignmentHours.toFixed(2)} h`,
      hint: "Created → assigned",
    },
    {
      label: "Backlog",
      value: String(kpi.backlog),
      hint: `${kpi.sampleSize} tickets in range`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as StaffCategory[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Lead time vs 2-day target
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpi.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend
                  onClick={(e) => toggle(String(e.dataKey))}
                  wrapperStyle={{ cursor: "pointer" }}
                />
                {!hidden.avgDays && (
                  <Line
                    type="monotone"
                    dataKey="avgDays"
                    name="Avg days"
                    stroke="hsl(174 62% 32%)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hidden.target && (
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="2-day target"
                    stroke="hsl(32 90% 52%)"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opened vs closed</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpi.volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend
                  onClick={(e) => toggle(String(e.dataKey))}
                  wrapperStyle={{ cursor: "pointer" }}
                />
                {!hidden.opened && (
                  <Bar dataKey="opened" name="Opened" fill="hsl(198 55% 36%)" />
                )}
                {!hidden.closed && (
                  <Bar dataKey="closed" name="Closed" fill="hsl(174 62% 32%)" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backlog by category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpi.backlogByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={90}
                  fontSize={11}
                />
                <Tooltip />
                <Bar dataKey="count" name="Open tickets" fill="hsl(32 90% 52%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SLA mix (in range)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpi.slaMix}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" name="Tickets" fill="hsl(174 62% 32%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
