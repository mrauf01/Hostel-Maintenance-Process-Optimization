import { getCurrentProfile } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardIndex() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/dashboard/student");
  if (user.role === "staff") redirect("/dashboard/staff");
  if (user.role === "sc") redirect("/dashboard/sc");
  redirect("/dashboard/admin");
}
