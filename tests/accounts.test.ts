import { test } from "node:test";
import assert from "node:assert/strict";
import { accountEmail, accountView, campaignObjectPath, slotAvailable, validateEmail, validateEmailCode, validatePassword, validateUsername } from "../lib/accounts";
import { readJson } from "../lib/request-guard";

test("legacy usernames remain readable for existing account sign-in", () => {
  assert.equal(validateUsername("  Atlas_1 "), "atlas_1");
  assert.equal(accountEmail("Atlas_1"), "atlas_1@player.novusarbitrium.app");
  assert.throws(() => validateUsername("ab"), /3–20/);
  assert.throws(() => validateUsername("has space"), /3–20/);
});

test("email accounts require real addresses and numeric confirmation codes", () => {
  assert.equal(validateEmail("  Dev@Example.com "), "dev@example.com");
  assert.throws(() => validateEmail("not-an-email"), /valid email/);
  assert.equal(validateEmailCode(" 123456 "), "123456");
  assert.throws(() => validateEmailCode("12x456"), /code sent/);
  assert.deepEqual(accountView({ email: "dev@example.com", user_metadata: {} }), { displayName: "dev", email: "dev@example.com" });
  assert.deepEqual(accountView({ email: "dev@example.com", user_metadata: { full_name: "Developer" } }), { displayName: "Developer", email: "dev@example.com" });
});

test("account request parsing enforces a byte limit before JSON parsing", async () => {
  const request = new Request("http://localhost/api/auth/email/start", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@example.com", padding: "é".repeat(4000) }),
  });
  await assert.rejects(readJson(request, 2048), (error: unknown) => typeof error === "object" && error !== null && "status" in error && error.status === 413);
});

test("passwords stay within the length the account system accepts", () => {
  assert.equal(validatePassword("long-enough"), "long-enough");
  assert.throws(() => validatePassword("short"), /8–72/);
});

test("campaign files stay inside the signed-in account folder", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const campaignId = "22222222-2222-4222-8222-222222222222";
  assert.equal(campaignObjectPath(userId, campaignId), `${userId}/${campaignId}.json`);
  assert.throws(() => campaignObjectPath(userId, "../22222222-2222-4222-8222-222222222222"), /Missing campaign/);
  assert.throws(() => campaignObjectPath("not-a-user", campaignId), /Missing campaign/);
});

test("a player can keep five campaigns and still update one of them", () => {
  const ids = ["a", "b", "c", "d", "e"];
  assert.equal(slotAvailable(ids, "c"), true);
  assert.equal(slotAvailable(ids, "f"), false);
  assert.equal(slotAvailable(ids.slice(0, 4), "f"), true);
});
