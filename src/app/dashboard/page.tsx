import { getCurrentProfile } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardIndex() {
  let user = null;
  try {
    user = await getCurrentProfile();
  } catch {
    redirect("/login?error=session");
  }
  if (!user) redirect("/login?error=profile");
  if (user.approved === false) redirect("/pending");
  if (user.role === "student") redirect("/dashboard/student");
  if (user.role === "staff") redirect("/dashboard/staff");
  if (user.role === "sc") redirect("/dashboard/sc");
  redirect("/dashboard/admin");
}
