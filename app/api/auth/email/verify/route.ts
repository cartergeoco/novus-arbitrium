import { accountView, validateEmail, validateEmailCode } from "@/lib/accounts";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { requireBrowserCheck } from "@/lib/browser-check";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 2048) as { email?: unknown; code?: unknown };
    const email = validateEmail(String(body.email ?? ""));
    const token = validateEmailCode(String(body.code ?? ""));
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error || !data.user) return privateJson({ error: "That code is invalid or expired. Request a new one." }, 401);
    return privateJson({ user: accountView(data.user) });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Could not verify the code." }, errorStatus(error));
  }
}
