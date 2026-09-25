import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw Error("Accounts are not configured on this server.");
  return { url, key };
}

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const { url, key } = supabaseUrl();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });
}

/** Service role. Server routes only. Used to confirm usernames and write private campaign files. */
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const usable = key.startsWith("eyJ") || key.startsWith("sb_secret_");
  if (!url || !usable) throw Object.assign(Error("Accounts are not configured on this server."), { status: 503 });
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
