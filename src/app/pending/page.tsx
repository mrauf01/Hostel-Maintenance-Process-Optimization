import { getCurrentProfile, signOut } from "@/actions/auth";
import { ROLE_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.approved !== false) redirect("/dashboard");

  const who =
    user.role === "staff" && user.category
      ? CATEGORY_LABELS[user.category]
      : ROLE_LABELS[user.role];

  return (
    <div className="flex min-h-screen items-center px-4">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Awaiting approval
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Account not activated yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {user.full_name} registered as <strong>{who}</strong> ({user.email}).
          The Chief Warden / Admin must approve this account before you can
          open the portal.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
