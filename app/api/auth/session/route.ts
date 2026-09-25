import { accountView } from "@/lib/accounts";
import { privateJson } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return privateJson({ user: null });
    return privateJson({ user: accountView(data.user) });
  } catch {
    return privateJson({ user: null });
  }
}
