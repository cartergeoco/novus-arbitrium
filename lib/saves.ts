import type { Campaign } from "./game";
import { ensureBrowserCheck } from "./browser-check-client";
import { campaigns as localCampaigns, deleteCampaign as deleteLocalCampaign, saveCampaign as saveLocalCampaign } from "./storage";

export type Account = { displayName: string; email: string | null };

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
        return body.user?.displayName ? body.user : null;
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
  await ensureBrowserCheck();
  const response = await fetch("/api/campaigns", { cache: "no-store" });
  const body = await response.json() as { campaigns?: Campaign[]; error?: string };
  if (!response.ok) throw Error(body.error || "Could not load account campaigns.");
  return body.campaigns || [];
}

export async function saveCampaign(campaign: Campaign) {
  const account = await readAccount();
  if (!account) return saveLocalCampaign(campaign);
  await ensureBrowserCheck();
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
  await ensureBrowserCheck();
  const response = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw Error(body.error || "Could not delete this campaign.");
}

async function submit(path: string, body: Record<string, unknown>) {
  if (path !== "/api/auth/signout") await ensureBrowserCheck();
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { user?: Account; url?: string; error?: string; pending?: string; email?: string };
  if (!response.ok) throw Error(result.error || "Could not complete sign-in.");
  return result;
}

function acceptAccount(user: Account | undefined) {
  if (!user?.displayName) throw Error("Sign-in completed without an account. Try again.");
  cached = user;
  emit();
  return user;
}

export type PendingSignIn = { pending: "code" | "recovery"; email: string };

function pending(result: { pending?: string; email?: string }) {
  if ((result.pending === "code" || result.pending === "recovery") && result.email) return { pending: result.pending, email: result.email };
  return null;
}

export async function requestEmailCode(email: string, purpose: "signup" | "signin" | "recovery") {
  await submit("/api/auth/email/start", { email, purpose });
}

export async function verifyEmailCode(email: string, code: string, purpose: "signup" | "signin" | "recovery", password?: string) {
  return acceptAccount((await submit("/api/auth/email/verify", { email, code, purpose, password })).user);
}

export async function signUp(username: string, email: string, password: string) {
  const result = await submit("/api/auth/signup", { username, email, password });
  return pending(result) || { user: acceptAccount(result.user) };
}

export async function signIn(username: string, password: string) {
  const result = await submit("/api/auth/signin", { username, password });
  return pending(result) || { user: acceptAccount(result.user) };
}

export async function requestPasswordReset(email: string) {
  await submit("/api/auth/email/start", { email, purpose: "recovery" });
}

export async function signInWithGoogle() {
  const result = await submit("/api/auth/google", {});
  if (!result.url) throw Error("Google sign-in did not return a destination.");
  window.location.assign(result.url);
}

export async function signOut() {
  await submit("/api/auth/signout", {});
  cached = null;
  emit();
}
