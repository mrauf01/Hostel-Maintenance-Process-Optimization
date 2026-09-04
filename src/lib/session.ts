import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };

export function getSessionUserId(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = getSessionUserId();
  if (!id) throw new Error("Not signed in");
  return id;
}
