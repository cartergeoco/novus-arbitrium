import { CAMPAIGN_SLOTS } from "@/lib/accounts";
import { deleteAccountCampaign, listAccountCampaigns, saveAccountCampaign } from "@/lib/campaign-store";
import { errorStatus, readJson, sameOrigin } from "@/lib/request-guard";
import { createSupabaseServer } from "@/lib/supabase";
import { parseCampaign } from "@/lib/validation";
import { NextResponse } from "next/server";

async function requireUser(request: Request) {
  if (!sameOrigin(request)) return { error: NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 }) };
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NextResponse.json({ error: "Sign in to use account campaigns." }, { status: 401 }) };
  return { userId: data.user.id };
}

export async function GET(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const campaigns = await listAccountCampaigns(client.userId);
    return NextResponse.json({ campaigns, slots: CAMPAIGN_SLOTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load campaigns.";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 500) });
  }
}

export async function PUT(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const campaign = parseCampaign(await readJson(request, 12_000_000));
    await saveAccountCampaign(client.userId, campaign);
    return NextResponse.json({ ok: true, slots: CAMPAIGN_SLOTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this campaign.";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 500) });
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await requireUser(request);
    if ("error" in client && client.error) return client.error;
    const id = new URL(request.url).searchParams.get("id") || "";
    await deleteAccountCampaign(client.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete this campaign.";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 500) });
  }
}
