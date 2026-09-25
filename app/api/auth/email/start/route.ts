import { validateEmail } from "@/lib/accounts";
import { requireBrowserCheck } from "@/lib/browser-check";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 2048) as { email?: unknown; purpose?: unknown };
    const email = validateEmail(String(body.email ?? ""));
    const purpose = body.purpose === "signup" || body.purpose === "recovery" ? body.purpose : "signin";
    const supabase = await createSupabaseServer();
    const sent = purpose === "recovery"
      ? await supabase.auth.resetPasswordForEmail(email)
      : purpose === "signup"
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (sent.error?.status === 429) return privateJson({ error: "Please wait before requesting another code." }, 429);
    if (sent.error && purpose === "signup") return privateJson({ error: "Could not send a code. Try again." }, 502);
    return privateJson({ ok: true });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Could not send a code." }, errorStatus(error));
  }
}
