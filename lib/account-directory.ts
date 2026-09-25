import { createSupabaseAdmin } from "@/lib/supabase";

const legacyDomain = "@player.novusarbitrium.app";

export function isLegacyAccountEmail(email: string) {
  return email.endsWith(legacyDomain);
}

/** Finds the real inbox stored for a username. Legacy accounts keep the synthetic address. */
export async function emailForUsername(username: string) {
  try {
    const admin = createSupabaseAdmin();
    for (let page = 1; page <= 5; page += 1) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listed.error || !listed.data.users.length) return null;
      const match = listed.data.users.find((user) => String(user.user_metadata?.username || "").toLowerCase() === username);
      if (match?.email) return match.email;
      if (listed.data.users.length < 200) return null;
    }
  } catch {
    return null;
  }
  return null;
}
