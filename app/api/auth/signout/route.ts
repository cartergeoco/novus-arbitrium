import { sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
