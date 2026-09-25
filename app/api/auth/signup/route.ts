import { accountEmail, validatePassword, validateUsername } from "@/lib/accounts";
import { errorStatus, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    const body = await readJson(request, 4000) as { username?: unknown; password?: unknown };
    const username = validateUsername(String(body.username ?? ""));
    const password = validatePassword(String(body.password ?? ""));
    const admin = createSupabaseAdmin();
    const created = await admin.auth.admin.createUser({
      email: accountEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (created.error || !created.data.user) {
      const taken = /already|registered|exists/i.test(created.error?.message || "");
      return NextResponse.json({ error: taken ? "That username is taken." : "Could not create the account." }, { status: taken ? 409 : 400 });
    }
    const supabase = await createSupabaseServer();
    const signedIn = await supabase.auth.signInWithPassword({ email: accountEmail(username), password });
    if (signedIn.error) return NextResponse.json({ error: "Account created, but sign-in failed. Try signing in." }, { status: 500 });
    return NextResponse.json({ username });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
