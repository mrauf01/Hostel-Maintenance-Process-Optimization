import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabase();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
