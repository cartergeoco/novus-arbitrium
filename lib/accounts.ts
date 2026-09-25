export const CAMPAIGN_SLOTS = 5;

const usernamePattern = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function accountEmail(username: string) {
  return `${normalizeUsername(username)}@player.novusarbitrium.app`;
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!usernamePattern.test(username)) {
    throw Error("Usernames are 3–20 characters: letters, numbers, and underscores.");
  }
  return username;
}

export function validatePassword(value: string) {
  if (value.length < 8 || value.length > 72) {
    throw Error("Passwords must be 8–72 characters.");
  }
  return value;
}

export function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/.test(email)) {
    throw Error("Enter a valid email address.");
  }
  return email;
}

export function validateEmailCode(value: string) {
  const code = value.trim();
  if (!/^\d{6,8}$/.test(code)) throw Error("Enter the code sent to your email.");
  return code;
}

export function accountView(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const email = typeof user.email === "string" ? user.email : null;
  const metadata = user.user_metadata || {};
  const name = [metadata.username, metadata.full_name, metadata.name]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
  return { displayName: (name?.trim() || email?.split("@")[0] || "Player").slice(0, 60), email };
}

/** An existing campaign can be saved again. A new one needs an open slot. */
export function slotAvailable(savedIds: string[], campaignId: string) {
  return savedIds.includes(campaignId) || savedIds.length < CAMPAIGN_SLOTS;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Private object path for one account campaign. Rejects anything that could escape the account folder. */
export function campaignObjectPath(userId: string, campaignId: string) {
  if (!uuidPattern.test(userId) || !uuidPattern.test(campaignId)) {
    throw Object.assign(Error("Missing campaign."), { status: 400 });
  }
  return `${userId}/${campaignId}.json`;
}
