import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServer();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/", url.origin), { headers: { "Cache-Control": "no-store" } });
    } catch { /* Show a generic error; never put auth codes or provider details in the URL. */ }
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin), { headers: { "Cache-Control": "no-store" } });
}
