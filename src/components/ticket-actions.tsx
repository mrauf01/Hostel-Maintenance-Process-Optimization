"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateComplaintStatus } from "@/actions/complaints";
import { AcknowledgeTimer } from "@/components/acknowledge-timer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Complaint, Profile, UserRole } from "@/lib/types";

export function TicketActions({
  complaint,
  role,
  staff,
}: {
  complaint: Complaint;
  role: UserRole;
  staff: Profile[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(
    complaint.completion_photo_url
  );
  const [assignee, setAssignee] = useState(
    complaint.assigned_staff_id || undefined
  );

  function run(
    input: Parameters<typeof updateComplaintStatus>[0],
    ok: string
  ) {
    start(async () => {
      const res = await updateComplaintStatus(input);
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {role === "staff" &&
        complaint.status === "assigned" &&
        !complaint.acknowledged_at &&
        complaint.assigned_at && (
          <>
            <AcknowledgeTimer assignedAt={complaint.assigned_at} />
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                run({ id: complaint.id, status: "assigned" }, "Job acknowledged")
              }
            >
              Acknowledge job
            </Button>
          </>
        )}

      {role === "staff" &&
        ["assigned", "reopened", "registered"].includes(complaint.status) && (
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(
                { id: complaint.id, status: "in_progress" },
                "Marked in progress"
              )
            }
          >
            Start inspection (In Progress)
          </Button>
        )}

      {role === "staff" && complaint.status === "in_progress" && (
        <div className="grid gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(
                {
                  id: complaint.id,
                  status: "pending_confirmation",
                  completion_photo_url: photo,
                  note: note || "Minor issue resolved on visit.",
                },
                "Sent for student confirmation"
              )
            }
          >
            Minor issue — mark work complete
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(
                {
                  id: complaint.id,
                  status: "material_requested",
                  note: note || "Spare parts requested.",
                },
                "Material requested — Admin notified"
              )
            }
          >
            Major — request spare parts
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                {
                  id: complaint.id,
                  status: "material_requested",
                  vendor_unavailable: true,
                  note: note || "Vendor unavailable.",
                },
                "Vendor unavailable — Admin notified"
              )
            }
          >
            Vendor unavailable
          </Button>
        </div>
      )}

      {role === "staff" &&
        (complaint.status === "material_requested" ||
          complaint.status === "in_progress") && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label>Completion photo</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Completion" className="max-h-40 rounded-md" />
            )}
            <Button
              className="w-full"
              disabled={pending || !photo}
              onClick={() =>
                run(
                  {
                    id: complaint.id,
                    status: "pending_confirmation",
                    completion_photo_url: photo,
                    note: note || "Work completed. Photo attached.",
                  },
                  "Awaiting student confirmation"
                )
              }
            >
              Upload completion & request confirmation
            </Button>
          </div>
        )}

      {role === "student" && complaint.status === "pending_confirmation" && (
        <div className="grid gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(
                { id: complaint.id, confirm: "resolved" },
                "Ticket closed. Thank you."
              )
            }
          >
            Confirm resolved
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              run(
                { id: complaint.id, confirm: "not_resolved" },
                "Reopened — staff and Admin notified"
              )
            }
          >
            Not resolved
          </Button>
        </div>
      )}

      {role === "student" &&
        complaint.status !== "resolved" &&
        !complaint.is_urgent && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run({ id: complaint.id, is_urgent: true }, "Flagged urgent for SC")
            }
          >
            Flag as urgent
          </Button>
        )}

      {role === "sc" && complaint.status !== "resolved" && (
        <Button
          disabled={pending}
          onClick={() =>
            run(
              {
                id: complaint.id,
                escalate_to_admin: true,
                note: note || "Escalated to Admin",
              },
              "Escalated to Admin"
            )
          }
        >
          Escalate to Admin
        </Button>
      )}

      {role === "admin" && complaint.status !== "resolved" && (
        <div className="space-y-2">
          <Label>Reassign staff</Label>
          <Select
            value={assignee || undefined}
            onValueChange={setAssignee}
          >
            <SelectTrigger>
              <SelectValue placeholder="Staff" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name} · {s.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            disabled={pending || !assignee}
            onClick={() =>
              run(
                { id: complaint.id, assigned_staff_id: assignee },
                "Reassigned"
              )
            }
          >
            Reassign
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                {
                  id: complaint.id,
                  further_escalation: true,
                  note: note,
                },
                "Flagged Further Escalation"
              )
            }
          >
            Flag further escalation
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Visible on the ticket timeline"
        />
        {(role === "staff" || role === "admin" || role === "sc") && (
          <Button
            variant="ghost"
            disabled={pending || !note.trim()}
            onClick={() =>
              run({ id: complaint.id, note }, "Note added")
            }
          >
            Add note only
          </Button>
        )}
      </div>
    </div>
  );
}
