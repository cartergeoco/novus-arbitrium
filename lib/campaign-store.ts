import type { SupabaseClient } from "@supabase/supabase-js";
import { campaignObjectPath, slotAvailable } from "@/lib/accounts";
import type { Campaign } from "@/lib/game";
import { createSupabaseAdmin } from "@/lib/supabase";
import { parseCampaign } from "@/lib/validation";

const BUCKET = "campaigns";

let bucketReady: Promise<void> | null = null;

async function adminClient() {
  const admin = createSupabaseAdmin();
  await ensureBucket(admin);
  return admin;
}

function ensureBucket(admin: SupabaseClient) {
  bucketReady ??= (async () => {
    const existing = await admin.storage.getBucket(BUCKET);
    if (existing.data) return;
    const created = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 12_000_000,
    });
    if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
      bucketReady = null;
      throw Object.assign(Error("Could not prepare campaign storage."), { status: 500 });
    }
  })();
  return bucketReady;
}

async function campaignIds(admin: SupabaseClient, userId: string) {
  const listed = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
  if (listed.error) throw Object.assign(Error("Could not load campaigns."), { status: 500 });
  return (listed.data || [])
    .filter((file) => file.name.endsWith(".json"))
    .map((file) => file.name.slice(0, -".json".length))
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}

export async function listAccountCampaigns(userId: string) {
  const admin = await adminClient();
  const ids = await campaignIds(admin, userId);
  const campaigns = await Promise.all(ids.map(async (id) => {
    const downloaded = await admin.storage.from(BUCKET).download(campaignObjectPath(userId, id));
    if (downloaded.error || !downloaded.data) return null;
    try {
      return parseCampaign(JSON.parse(await downloaded.data.text()));
    } catch {
      return null;
    }
  }));
  return campaigns.filter((campaign): campaign is Campaign => campaign !== null);
}

export async function saveAccountCampaign(userId: string, campaign: Campaign) {
  const admin = await adminClient();
  const ids = await campaignIds(admin, userId);
  if (!slotAvailable(ids, campaign.id)) {
    throw Object.assign(Error("You already have 5 campaigns. Delete one to free a slot."), { status: 409 });
  }
  const saved = await admin.storage.from(BUCKET).upload(campaignObjectPath(userId, campaign.id), JSON.stringify(campaign), {
    contentType: "application/json",
    upsert: true,
  });
  if (saved.error) throw Object.assign(Error("Could not save this campaign."), { status: 500 });
}

export async function deleteAccountCampaign(userId: string, campaignId: string) {
  const admin = await adminClient();
  const removed = await admin.storage.from(BUCKET).remove([campaignObjectPath(userId, campaignId)]);
  if (removed.error) throw Object.assign(Error("Could not delete this campaign."), { status: 500 });
}
