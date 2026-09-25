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
