import { getCurrentProfile } from "@/actions/auth";
import { listProfiles } from "@/actions/complaints";
import { AppShell } from "@/components/app-shell";
import { ComplaintForm } from "@/components/complaint-form";
import { redirect } from "next/navigation";

export default async function NewComplaintPage() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role !== "student" && user.role !== "staff" && user.role !== "admin") {
    redirect("/dashboard");
  }
  const students =
    user.role === "staff" || user.role === "admin" ? await listProfiles() : [];

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Log a complaint</h1>
      <p className="text-sm text-muted-foreground">
        One portal. Ticket ID is generated on submit. Priority comes from the
        SLA matrix unless the desk overrides it.
      </p>
      <div className="mx-auto mt-6 max-w-xl">
        <ComplaintForm role={user.role} students={students} />
      </div>
    </AppShell>
  );
}
