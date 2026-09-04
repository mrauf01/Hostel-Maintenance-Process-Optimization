import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSupabaseSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });
  if (!url || !key) {
    return { userId: null as string | null, response };
  }
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) {
    return { userId: null as string | null, response };
  }

  try {
    let next = response;
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          next = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            next.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { userId: user?.id ?? null, response: next };
  } catch {
    return { userId: null, response };
  }
}
