"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createComplaint } from "@/actions/complaints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ISSUE_TYPES, PRIORITY_LABELS } from "@/lib/constants";
import { triageIssue } from "@/lib/sla";
import type { IssueType, Priority, Profile, UserRole } from "@/lib/types";
import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

export function ComplaintForm({
  role,
  students,
}: {
  role: UserRole;
  students: Profile[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issue, setIssue] = useState<IssueType | "">("");
  const [urgent, setUrgent] = useState(false);
  const [override, setOverride] = useState<Priority | "auto">("auto");
  const [studentId, setStudentId] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = useMemo(() => {
    if (!issue) return null;
    return triageIssue(
      issue,
      description,
      title,
      override === "auto" ? null : override
    );
  }, [issue, description, title, override]);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Enter a title.";
    if (!description.trim()) e.description = "Describe what is happening.";
    if (!issue) e.issue = "Pick an issue type so we can auto-triage.";
    if ((role === "staff" || role === "admin") && !studentId) e.student = "Select the student.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image.");
      return;
    }
    try {
      setPhoto(await compressImage(file));
    } catch {
      toast.error("Could not read that image.");
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!validate()) {
          toast.error("Fix the highlighted fields.");
          return;
        }
        start(async () => {
          const res = await createComplaint({
            title,
            description,
            issue_type: issue as IssueType,
            is_urgent: urgent,
            photo_url: photo,
            manual_priority: override === "auto" ? null : override,
            student_id: role === "staff" || role === "admin" ? studentId : null,
          });
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success(`Ticket ${res.ticket_id} created`);
          router.push(`/complaints/${res.ticket_id}`);
        });
      }}
    >
      {(role === "staff" || role === "admin") && (
        <div className="space-y-1.5">
          <Label htmlFor="student">Student (walk-in / call)</Label>
          <Select value={studentId || undefined} onValueChange={setStudentId}>
            <SelectTrigger id="student" aria-invalid={!!errors.student}>
              <SelectValue placeholder="Who is this for?" />
            </SelectTrigger>
            <SelectContent>
              {students
                .filter((s) => s.role === "student")
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} · {s.hostel_block}
                    {s.room_number} · {s.phone ? `${s.phone} · ` : ""}
                    {s.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.student && (
            <p className="text-sm text-destructive">{errors.student}</p>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Issue type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ISSUE_TYPES.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => {
                setIssue(i.value);
                setErrors((e) => ({ ...e, issue: "" }));
              }}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 hover:border-primary/40",
                issue === i.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "bg-card"
              )}
            >
              <span className="font-semibold">{i.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {i.hint}
              </span>
            </button>
          ))}
        </div>
        {errors.issue && (
          <p className="mt-1 text-sm text-destructive">{errors.issue}</p>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim())
              setErrors((x) => ({ ...x, title: "" }));
          }}
          placeholder="e.g. Water leak under washbasin"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label htmlFor="desc">What is happening?</Label>
          <span className="text-xs text-muted-foreground">
            {description.length}/600
          </span>
        </div>
        <Textarea
          id="desc"
          maxLength={600}
          rows={5}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (e.target.value.trim())
              setErrors((x) => ({ ...x, description: "" }));
          }}
          placeholder="Room, when it started, anything you’ve already tried…"
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      {role === "staff" && (
        <div className="space-y-1.5">
          <Label>Priority override (registration desk)</Label>
          <Select
            value={override}
            onValueChange={(v) => setOverride(v as Priority | "auto")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto from SLA matrix</SelectItem>
              <SelectItem value="P1">{PRIORITY_LABELS.P1}</SelectItem>
              <SelectItem value="P2">{PRIORITY_LABELS.P2}</SelectItem>
              <SelectItem value="P3">{PRIORITY_LABELS.P3}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm">
          Auto-triage:{" "}
          <strong className="capitalize">{preview.category}</strong> ·{" "}
          <strong>{PRIORITY_LABELS[preview.priority]}</strong>
          {urgent ? " · will appear in the Student council member queue" : ""}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={urgent}
          onCheckedChange={(v) => setUrgent(Boolean(v))}
          className="mt-0.5"
        />
        <span>
          Flag as <strong>Urgent</strong> — Student council member grievance queue
        </span>
      </label>

      <div
        className="rounded-xl border border-dashed p-4 text-center transition-colors duration-200 hover:border-primary/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
      >
        <p className="text-sm font-medium">Photo of the issue</p>
        <p className="text-xs text-muted-foreground">
          Drag and drop or tap to upload. Preview before submit.
        </p>
        <input
          type="file"
          accept="image/*"
          className="mt-2 w-full text-sm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Issue preview"
            className="mx-auto mt-3 max-h-48 rounded-lg border object-cover"
          />
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Creating ticket…" : "Submit complaint"}
      </Button>
    </form>
  );
}
