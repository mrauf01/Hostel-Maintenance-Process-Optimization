import { getCurrentProfile } from "@/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    user = await getCurrentProfile();
  } catch {
    redirect("/login?error=session");
  }
  if (user && user.approved === false) redirect("/pending");
  return children;
}
