import { accountView, validateEmail, validateEmailCode, validatePassword } from "@/lib/accounts";
import { requireBrowserCheck } from "@/lib/browser-check";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 4000) as { email?: unknown; code?: unknown; purpose?: unknown; password?: unknown };
    const email = validateEmail(String(body.email ?? ""));
    const token = validateEmailCode(String(body.code ?? ""));
    const purpose = body.purpose === "signup" || body.purpose === "recovery" ? body.purpose : "signin";
    const supabase = await createSupabaseServer();
    const type = purpose === "signup" ? "signup" : purpose === "recovery" ? "recovery" : "email";
    let verified = await supabase.auth.verifyOtp({ email, token, type });
    if ((verified.error || !verified.data.user) && purpose === "signup") {
      verified = await supabase.auth.verifyOtp({ email, token, type: "email" });
    }
    if (verified.error || !verified.data.user) return privateJson({ error: "That code is invalid or expired. Request a new one." }, 401);
    if (purpose === "recovery") {
      const password = validatePassword(String(body.password ?? ""));
      const updated = await supabase.auth.updateUser({ password });
      if (updated.error || !updated.data.user) return privateJson({ error: "Could not save the new password." }, 400);
      return privateJson({ user: accountView(updated.data.user) });
    }
    return privateJson({ user: accountView(verified.data.user) });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Could not verify the code." }, errorStatus(error));
  }
}
