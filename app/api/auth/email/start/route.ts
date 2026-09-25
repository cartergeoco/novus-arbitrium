import { validateEmail } from "@/lib/accounts";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { requireBrowserCheck } from "@/lib/browser-check";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const body = await readJson(request, 2048) as { email?: unknown; createAccount?: unknown };
    const email = validateEmail(String(body.email ?? ""));
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: body.createAccount === true },
    });
    if (error) {
      if (error.status === 429) return privateJson({ error: "Please wait before requesting another code." }, 429);
      // The sign-in path must not reveal whether an email is registered.
      if (body.createAccount !== true && error.status === 400) return privateJson({ ok: true });
      return privateJson({ error: "Could not send a code. Check the Supabase email provider and try again." }, 502);
    }
    return privateJson({ ok: true });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Could not send a code." }, errorStatus(error));
  }
}
