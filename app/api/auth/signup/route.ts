import { emailForUsername } from "@/lib/account-directory";
import { accountView, validateEmail, validatePassword, validateUsername } from "@/lib/accounts";
import { requireBrowserCheck } from "@/lib/browser-check";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 4000) as { username?: unknown; email?: unknown; password?: unknown };
    const username = validateUsername(String(body.username ?? ""));
    const email = validateEmail(String(body.email ?? ""));
    const password = validatePassword(String(body.password ?? ""));
    if (await emailForUsername(username)) return privateJson({ error: "That username is taken." }, 409);
    const supabase = await createSupabaseServer();
    const created = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (created.error || !created.data.user) {
      const message = created.error?.message || "";
      if (created.error) console.error("signup failed", created.error.status, created.error.code, message);
      if (created.error?.status === 429 || /rate limit/i.test(message)) {
        return privateJson({ error: "Too many confirmation emails were sent in the last hour. Wait a little while, then try again." }, 429);
      }
      const taken = /already|registered|exists/i.test(message);
      return privateJson({ error: taken ? "That email is already registered." : "Could not create the account." }, taken ? 409 : 400);
    }
    if (created.data.session) return privateJson({ user: accountView(created.data.user) });
    return privateJson({ pending: "code", email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    return privateJson({ error: message }, errorStatus(error));
  }
}
