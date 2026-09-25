import { emailForUsername, isLegacyAccountEmail } from "@/lib/account-directory";
import { accountEmail, accountView, validateEmail, validatePassword, validateUsername } from "@/lib/accounts";
import { requireBrowserCheck } from "@/lib/browser-check";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

async function sendSignInCode(email: string, user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  const supabase = await createSupabaseServer();
  const sent = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (sent.error?.status === 429) return privateJson({ error: "Please wait before requesting another code." }, 429);
  if (sent.error) return user ? privateJson({ user: accountView(user) }) : privateJson({ error: "Could not send a code. Try again." }, 502);
  await supabase.auth.signOut();
  return privateJson({ pending: "code", email });
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 4000) as { username?: unknown; password?: unknown };
    const raw = String(body.username ?? "").trim();
    const password = validatePassword(String(body.password ?? ""));
    const username = raw.includes("@") ? "" : validateUsername(raw);
    let email = raw.includes("@") ? validateEmail(raw) : accountEmail(username);
    const supabase = await createSupabaseServer();
    let signedIn = await supabase.auth.signInWithPassword({ email, password });
    if ((signedIn.error || !signedIn.data.user) && username) {
      const found = await emailForUsername(username);
      if (found && found !== email) {
        email = found;
        signedIn = await supabase.auth.signInWithPassword({ email, password });
      }
    }
    if (signedIn.error || !signedIn.data.user) {
      if (/not confirmed/i.test(signedIn.error?.message || "")) return sendSignInCode(email, null);
      return privateJson({ error: "Username or password is incorrect." }, 401);
    }
    if (isLegacyAccountEmail(email)) return privateJson({ user: accountView(signedIn.data.user) });
    return sendSignInCode(email, signedIn.data.user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in.";
    return privateJson({ error: message }, errorStatus(error));
  }
}
