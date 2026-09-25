import { accountEmail, validatePassword, validateUsername } from "@/lib/accounts";
import { errorStatus, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    const body = await readJson(request, 4000) as { username?: unknown; password?: unknown };
    const username = validateUsername(String(body.username ?? ""));
    const password = validatePassword(String(body.password ?? ""));
    const supabase = await createSupabaseServer();
    const signedIn = await supabase.auth.signInWithPassword({ email: accountEmail(username), password });
    if (signedIn.error || !signedIn.data.user) {
      return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
    }
    return NextResponse.json({ username });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in.";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
