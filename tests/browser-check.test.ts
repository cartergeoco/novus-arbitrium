import { test } from "node:test";
import assert from "node:assert/strict";
import { browserCheckCookie, browserCheckState, requireBrowserCheck, validBrowserCheckCookie, verifyBrowserToken } from "../lib/browser-check";

test("browser check cookies are signed, short-lived, and bound to the site hostname", async () => {
  const secret = "a-really-long-and-separate-browser-check-signing-secret";
  const now = Date.now();
  const cookie = await browserCheckCookie("example.com", secret, now);
  assert.equal(await validBrowserCheckCookie(cookie, "example.com", secret, now), true);
  assert.equal(await validBrowserCheckCookie(cookie, "other.example.com", secret, now), false);
  assert.equal(await validBrowserCheckCookie(cookie, "example.com", secret, now + 20 * 60_000), false);
  assert.equal(await validBrowserCheckCookie(`${cookie}x`, "example.com", secret, now), false);
  assert.equal(await validBrowserCheckCookie(cookie, "example.com", "different-key-that-is-also-long-enough", now), false);
});

test("production browser check rejects unverified callers and validates Turnstile hostname and action", async (t) => {
  const names = ["NODE_ENV", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "BROWSER_CHECK_SECRET"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  t.after(() => { for (const name of names) {
    if (previous[name] === undefined) Reflect.deleteProperty(process.env, name); else Reflect.set(process.env, name, previous[name]);
  } });
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.TURNSTILE_SITE_KEY = "site-key";
  process.env.TURNSTILE_SECRET_KEY = "server-only-key";
  process.env.BROWSER_CHECK_SECRET = "another-independent-signing-secret-over-32-chars";
  const request = new Request("https://example.com/api/browser-check");
  assert.equal((await browserCheckState(request)).verified, false);
  await assert.rejects(requireBrowserCheck(request), /security check/);
  const verify = (hostname: string, action: string) => async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const fields = init?.body as URLSearchParams;
    assert.equal(fields.get("secret"), "server-only-key");
    assert.equal(fields.get("response"), "browser-token");
    return Response.json({ success: true, hostname, action });
  };
  assert.equal((await verifyBrowserToken(request, "browser-token", verify("example.com", "other_action"))).verified, false);
  assert.equal((await verifyBrowserToken(request, "browser-token", verify("other.example.com", "browser_check"))).verified, false);
  const result = await verifyBrowserToken(request, "browser-token", verify("example.com", "browser_check"));
  assert.equal(result.verified, true);
  const verifiedRequest = new Request(request, { headers: { cookie: `novus_browser_check=${result.cookie}` } });
  assert.equal((await browserCheckState(verifiedRequest)).verified, true);
  await requireBrowserCheck(verifiedRequest);
});

test("an unconfigured browser check is skipped, and a partial setup fails closed", async (t) => {
  const previous = process.env.NODE_ENV;
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const signingSecret = process.env.BROWSER_CHECK_SECRET;
  t.after(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", previous);
    if (siteKey === undefined) delete process.env.TURNSTILE_SITE_KEY; else process.env.TURNSTILE_SITE_KEY = siteKey;
    if (secretKey === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = secretKey;
    if (signingSecret === undefined) delete process.env.BROWSER_CHECK_SECRET; else process.env.BROWSER_CHECK_SECRET = signingSecret;
  });
  Reflect.set(process.env, "NODE_ENV", "production");
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.BROWSER_CHECK_SECRET;
  const request = new Request("https://example.com/api/turn");
  assert.equal((await browserCheckState(request)).verified, true);
  await requireBrowserCheck(request);
  process.env.TURNSTILE_SITE_KEY = "site-key";
  await assert.rejects(requireBrowserCheck(request), /not configured/);
});
