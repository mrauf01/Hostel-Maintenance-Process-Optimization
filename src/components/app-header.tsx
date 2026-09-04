"use client";

import { Bell, LogOut, Plus, University } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { signOut, switchDemoUser } from "@/actions/auth";
import { listNotifications, markNotificationsRead } from "@/actions/complaints";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import type { AppNotification, Profile } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export function AppHeader({
  user,
  demoUsers,
  demoMode,
}: {
  user: Profile;
  demoUsers: Profile[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [notes, setNotes] = useState<AppNotification[]>([]);

  useEffect(() => {
    let live = true;
    const load = () =>
      listNotifications()
        .then((n) => {
          if (live) setNotes(Array.isArray(n) ? n : []);
        })
        .catch(() => {
          if (live) setNotes([]);
        });
    load();
    const t = setInterval(load, 4000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [user.id]);

  const unread = notes.filter((n) => !n.read).length;
  const home =
    user.role === "student"
      ? "/dashboard/student"
      : user.role === "staff"
        ? "/dashboard/staff"
        : user.role === "sc"
          ? "/dashboard/sc"
          : "/dashboard/admin";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={home} className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <University className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link
            href={home}
            className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-secondary"
          >
            Dashboard
          </Link>
          {(user.role === "student" || user.role === "staff") && (
            <Link
              href="/complaints/new"
              className="rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-secondary"
            >
              New complaint
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1">
          {user.role === "student" && (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/complaints/new">
                <Plus className="h-4 w-4" /> New
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Notifications, ${unread} unread`}
                onClick={() => unread && markNotificationsRead()}
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Updates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notes.slice(0, 8).length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              )}
              {notes.slice(0, 8).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-0.5"
                  onClick={() =>
                    n.complaint_id && router.refresh()
                  }
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.body} · {relativeTime(n.created_at)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {demoMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[140px] truncate">
                  {ROLE_LABELS[user.role]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {demoUsers.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() =>
                      start(async () => {
                        await switchDemoUser(p.id);
                        const dest =
                          p.role === "student"
                            ? "/dashboard/student"
                            : p.role === "staff"
                              ? "/dashboard/staff"
                              : p.role === "sc"
                                ? "/dashboard/sc"
                                : "/dashboard/admin";
                        router.push(dest);
                        router.refresh();
                      })
                    }
                  >
                    <span className="flex flex-col">
                      <span>{p.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABELS[p.role]}
                        {p.category ? ` · ${p.category}` : ""}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
