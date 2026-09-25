import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseProjectUrl() {
  const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw Object.assign(Error("Set SUPABASE_URL to enable accounts."), { status: 503 });
  let url: URL;
  try { url = new URL(raw); }
  catch { throw Object.assign(Error("SUPABASE_URL is invalid."), { status: 503 }); }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((!local && url.protocol !== "https:") || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw Object.assign(Error("SUPABASE_URL must be a project origin (HTTPS outside localhost)."), { status: 503 });
  return url.origin;
}

function publishableKey() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw Object.assign(Error("Set SUPABASE_PUBLISHABLE_KEY to enable accounts."), { status: 503 });
  if (!key.startsWith("sb_publishable_") && jwtRole(key) !== "anon")
    throw Object.assign(Error("SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key."), { status: 503 });
  return key;
}

function jwtRole(key: string) {
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { role?: unknown }).role;
  } catch { return null; }
}

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseProjectUrl(), publishableKey(), {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet)
          cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
      },
    },
  });
}

/** Service role. Server routes only. Used to confirm usernames and write private campaign files. */
export function createSupabaseAdmin() {
  const url = supabaseProjectUrl();
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const usable = key.startsWith("sb_secret_") || jwtRole(key) === "service_role";
  if (!usable) throw Object.assign(Error("Set SUPABASE_SECRET_KEY to enable account storage."), { status: 503 });
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
