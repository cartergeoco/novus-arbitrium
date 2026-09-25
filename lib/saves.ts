import type { Campaign } from "./game";
import { campaigns as localCampaigns, deleteCampaign as deleteLocalCampaign, saveCampaign as saveLocalCampaign } from "./storage";

export type Account = { username: string };

let cached: Account | null | undefined;
let loading: Promise<Account | null> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentAccount() {
  return cached === undefined ? null : cached;
}

async function readAccount() {
  if (cached !== undefined) return cached;
  if (!loading) {
    loading = fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { user?: Account | null };
        return body.user?.username ? body.user : null;
      })
      .catch(() => null)
      .finally(() => { loading = null; });
  }
  cached = await loading;
  emit();
  return cached;
}

export async function campaigns(): Promise<Campaign[]> {
  const account = await readAccount();
  if (!account) return localCampaigns();
  const response = await fetch("/api/campaigns", { cache: "no-store" });
  const body = await response.json() as { campaigns?: Campaign[]; error?: string };
  if (!response.ok) throw Error(body.error || "Could not load account campaigns.");
  return body.campaigns || [];
}

export async function saveCampaign(campaign: Campaign) {
  const account = await readAccount();
  if (!account) return saveLocalCampaign(campaign);
  const response = await fetch("/api/campaigns", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(campaign),
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw Error(body.error || "Could not save this campaign.");
}

export async function deleteCampaign(id: string) {
  const account = await readAccount();
  if (!account) return deleteLocalCampaign(id);
  const response = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw Error(body.error || "Could not delete this campaign.");
}

async function submit(path: string, username: string, password: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => ({})) as { username?: string; error?: string };
  if (!response.ok || !body.username) throw Error(body.error || "Could not sign in.");
  cached = { username: body.username };
  emit();
  return cached;
}

export function signUp(username: string, password: string) {
  return submit("/api/auth/signup", username, password);
}

export function signIn(username: string, password: string) {
  return submit("/api/auth/signin", username, password);
}

export async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  cached = null;
  emit();
}
