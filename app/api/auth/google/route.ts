import { errorStatus, privateJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer, supabaseProjectUrl } from "@/lib/supabase";
import { requireBrowserCheck } from "@/lib/browser-check";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    await requireBrowserCheck(request);
    const origin = new URL(request.url).origin;
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
    });
    if (error || !data.url) return privateJson({ error: "Google sign-in is unavailable. Check the Supabase Google provider setup." }, 502);
    const destination = new URL(data.url);
    if (destination.origin !== supabaseProjectUrl() || !destination.pathname.startsWith("/auth/v1/authorize"))
      return privateJson({ error: "Google sign-in returned an unsafe redirect." }, 502);
    return privateJson({ url: destination.href });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Could not start Google sign-in." }, errorStatus(error));
  }
}
