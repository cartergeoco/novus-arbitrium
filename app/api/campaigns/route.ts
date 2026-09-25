import { CAMPAIGN_SLOTS } from "@/lib/accounts";
import { requireBrowserCheck } from "@/lib/browser-check";
import { deleteAccountCampaign, listAccountCampaigns, saveAccountCampaign } from "@/lib/campaign-store";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { parseCampaign } from "@/lib/validation";

async function requireUser(request: Request) {
  if (!sameOrigin(request)) return { error: privateJson({ error: "Cross-site requests are not allowed." }, 403) };
  await requireBrowserCheck(request);
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: privateJson({ error: "Sign in to use account campaigns." }, 401) };
  return { userId: data.user.id };
}

export async function GET(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const campaigns = await listAccountCampaigns(client.userId);
    return privateJson({ campaigns, slots: CAMPAIGN_SLOTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load campaigns.";
    return privateJson({ error: message }, errorStatus(error, 500));
  }
}

export async function PUT(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const campaign = parseCampaign(await readJson(request, 12_000_000));
    await saveAccountCampaign(client.userId, campaign);
    return privateJson({ ok: true, slots: CAMPAIGN_SLOTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this campaign.";
    return privateJson({ error: message }, errorStatus(error, 500));
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const id = new URL(request.url).searchParams.get("id") || "";
    await deleteAccountCampaign(client.userId, id);
    return privateJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete this campaign.";
    return privateJson({ error: message }, errorStatus(error, 500));
  }
}
