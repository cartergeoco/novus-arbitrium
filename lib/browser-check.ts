import { privateJson } from "./request-guard";

const cookieName = "novus_browser_check";
const lifetimeSeconds = 20 * 60;
const action = "browser_check";
const encoder = new TextEncoder();

function configuration() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  const signingSecret = process.env.BROWSER_CHECK_SECRET?.trim();
  if (!siteKey && !secretKey && !signingSecret) return null;
  if (!siteKey || !secretKey || !signingSecret || signingSecret.length < 32)
    throw Object.assign(Error("Browser verification is not configured. Set the Turnstile keys and a 32+ character BROWSER_CHECK_SECRET."), { status: 503 });
  return { siteKey, secretKey, signingSecret };
}

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function browserCheckCookie(host: string, secret: string, now = Date.now()) {
  const payload = encode(encoder.encode(JSON.stringify({ host, expires: now + lifetimeSeconds * 1000 })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

export async function validBrowserCheckCookie(value: string | undefined, host: string, secret: string, now = Date.now()) {
  if (!value || value.length > 1024) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), decode(signature), encoder.encode(payload));
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(decode(payload))) as { host?: unknown; expires?: unknown };
    return data.host === host && typeof data.expires === "number" && data.expires > now && data.expires <= now + lifetimeSeconds * 1000;
  } catch { return false; }
}

function cookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}

function host(request: Request) {
  return new URL(request.url).hostname.toLowerCase();
}

export async function browserCheckState(request: Request) {
  const config = configuration();
  if (!config) return { verified: true, siteKey: null };
  return { verified: await validBrowserCheckCookie(cookie(request), host(request), config.signingSecret), siteKey: config.siteKey };
}

export async function requireBrowserCheck(request: Request) {
  if ((await browserCheckState(request)).verified) return;
  throw Object.assign(Error("Complete the browser security check and try again."), { status: 403 });
}

export async function verifyBrowserToken(request: Request, token: string, verify = fetch) {
  const config = configuration();
  if (!config) return { verified: true, cookie: null };
  if (!token || token.length > 2048) return { verified: false, cookie: null };
  const form = new URLSearchParams({ secret: config.secretKey, response: token });
  const response = await verify("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: form, cache: "no-store", redirect: "manual", signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
  });
  if (!response.ok) return { verified: false, cookie: null };
  const result = await response.json() as { success?: unknown; hostname?: unknown; action?: unknown };
  if (result.success !== true || result.hostname !== host(request) || result.action !== action)
    return { verified: false, cookie: null };
  return { verified: true, cookie: await browserCheckCookie(host(request), config.signingSecret) };
}

export function browserCheckResponse(error: unknown) {
  const status = typeof error === "object" && error && "status" in error && error.status === 503 ? 503 : 502;
  return privateJson({ error: status === 503 ? (error as Error).message : "Browser verification is temporarily unavailable." }, status);
}

export const browserCheckCookieOptions = {
  name: cookieName, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/", maxAge: lifetimeSeconds,
};
