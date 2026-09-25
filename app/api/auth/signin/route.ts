import { accountEmail, accountView, validatePassword, validateUsername } from "@/lib/accounts";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { requireBrowserCheck } from "@/lib/browser-check";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 4000) as { username?: unknown; password?: unknown };
    const username = validateUsername(String(body.username ?? ""));
    const password = validatePassword(String(body.password ?? ""));
    const supabase = await createSupabaseServer();
    const signedIn = await supabase.auth.signInWithPassword({ email: accountEmail(username), password });
    if (signedIn.error || !signedIn.data.user) {
      return privateJson({ error: "Username or password is incorrect." }, 401);
    }
    return privateJson({ user: accountView(signedIn.data.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in.";
    return privateJson({ error: message }, errorStatus(error));
  }
}
