"use client";

import { useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Profile } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b py-2.5 last:border-b-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-all">{value}</dd>
    </div>
  );
}

export function AccountMenu({ user }: { user: Profile }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const role = ROLE_LABELS[user.role] ?? user.role;
  const category = user.category
    ? CATEGORY_LABELS[user.category] ?? user.category
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="max-w-[11rem] gap-2"
            aria-label="My account"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {initials(user.full_name)}
            </span>
            <span className="hidden truncate sm:inline">My account</span>
            <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setAccountOpen(true)}
          >
            <UserRound className="h-4 w-4" />
            Account details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My account</DialogTitle>
            <DialogDescription>
              Details on file for this hostel portal login.
            </DialogDescription>
          </DialogHeader>
          <dl>
            <Row label="Name" value={user.full_name} />
            <Row label="Email" value={user.email} />
            <Row label="Contact no" value={user.phone || "—"} />
            <Row label="Role" value={role} />
            {category && <Row label="Desk" value={category} />}
            {user.hostel_block && (
              <Row label="Hostel block" value={user.hostel_block} />
            )}
            {user.room_number && (
              <Row label="Room" value={user.room_number} />
            )}
            <Row
              label="Status"
              value={user.approved === false ? "Waiting for approval" : "Active"}
            />
            {user.created_at && (
              <Row label="Joined" value={formatDateTime(user.created_at)} />
            )}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setAccountOpen(false);
                setConfirmOpen(true);
              }}
            >
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will need your email and password to sign back in to the
              hostel portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Stay signed in
            </Button>
            <form action={signOut}>
              <Button variant="destructive" type="submit" className="w-full">
                Log out
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
