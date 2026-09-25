import { privateJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return privateJson({ ok: true });
}
