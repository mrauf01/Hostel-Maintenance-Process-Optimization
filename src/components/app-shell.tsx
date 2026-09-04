import { AppHeader } from "@/components/app-header";
import { getCurrentProfile } from "@/actions/auth";
import { listProfiles } from "@/actions/complaints";
import { isDemoMode } from "@/lib/mode";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await getCurrentProfile();
  } catch (e) {
    console.error(e);
    redirect("/login?error=session");
  }
  if (!user) redirect("/login");
  const demo = isDemoMode();
  let demoUsers: Awaited<ReturnType<typeof listProfiles>> = [];
  try {
    demoUsers = demo ? await listProfiles() : [];
  } catch {
    demoUsers = [];
  }
  return (
    <div className="min-h-screen">
      <AppHeader user={user} demoUsers={demoUsers} demoMode={demo} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
