import { test } from "node:test";
import assert from "node:assert/strict";
import { accountEmail, campaignObjectPath, slotAvailable, validatePassword, validateUsername } from "../lib/accounts";

test("usernames are stored lowercase and become a private sign-in address", () => {
  assert.equal(validateUsername("  Atlas_1 "), "atlas_1");
  assert.equal(accountEmail("Atlas_1"), "atlas_1@player.novusarbitrium.app");
  assert.throws(() => validateUsername("ab"), /3–20/);
  assert.throws(() => validateUsername("has space"), /3–20/);
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
