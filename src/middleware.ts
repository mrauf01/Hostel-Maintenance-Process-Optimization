import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const demoSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { userId, response } = await updateSupabaseSession(request);
  const hasSession = demoSession || Boolean(userId);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Never bounce /login ↔ /dashboard here. A cookie without a profile
  // would otherwise loop and render a blank page.
  if (PUBLIC.includes(pathname) || pathname === "/") {
    return response;
  }

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => {
      redirect.cookies.set(c.name, c.value);
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
