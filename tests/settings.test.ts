import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults, limits, normalizeNumber, parseSettings, selectProvider } from "../lib/settings";
import { createSessionKeys } from "../lib/session-keys";
import { estimateTurnTokens, instructions, turnMessages } from "../lib/generation";

test("provider switches restore each model across reloads without crossing credentials", () => {
  let settings = parseSettings({ ...defaults, model: "local-custom:8b" });
  settings = selectProvider(settings, "openai");
  assert.equal(settings.model, "gpt-4.1-mini");
  settings = parseSettings({ ...settings, model: "gpt-4.1" });
  settings = selectProvider(settings, "openrouter");
  assert.equal(settings.model, "openai/gpt-4.1-mini");
  settings = parseSettings({ ...settings, model: "another/model" });
  const reloaded = parseSettings(JSON.parse(JSON.stringify(settings)));
  assert.equal(selectProvider(reloaded, "openai").model, "gpt-4.1");
  assert.equal(selectProvider(reloaded, "ollama").model, "local-custom:8b");
  const keys = createSessionKeys();
  keys.set("openai", "  openai-test-key  ");
  assert.equal(keys.get("openrouter"), "");
  keys.set("openrouter", "router-test-key");
  assert.equal(keys.get("openai"), "openai-test-key");
  assert.equal(keys.get("openrouter"), "router-test-key");
  keys.set("ollama", "access-key");
  assert.equal(keys.get("ollama"), "access-key");
  assert.equal(createSessionKeys().get("openai"), "");
  keys.set("openai", "");
  assert.equal(keys.get("openai"), "");
  assert.equal(keys.get("openrouter"), "router-test-key");
});

test("partial and legacy settings recover without dropping valid preferences or saving secrets", () => {
  const parsed = parseSettings({ provider: "openrouter", model: "custom/model", temperature: NaN,
    contextNations: 16, fontSize: 19, prompt: "Preserve this.",
    key: "secret", apiKey: "secret", providerModels: { openai: "custom-openai", key: "secret" } });
  assert.equal(parsed.provider, "openrouter");
  assert.equal(parsed.model, "custom/model");
  assert.equal(parsed.providerModels.openai, "custom-openai");
  assert.equal(parsed.fontSize, 19);
  assert.equal(parsed.prompt, "Preserve this.");
  assert.equal(parsed.contextNations, 16);
  assert.equal(parsed.temperature, defaults.temperature);
  assert.ok(!JSON.stringify(parsed).includes("secret"));
  assert.equal(parseSettings({ provider: "openai" }).model, "gpt-4.1-mini");
  const legacy = parseSettings({ ...defaults, provider: "demo", model: "", fontSize: 18 });
  assert.equal(legacy.provider, "ollama");
  assert.equal(legacy.model, defaults.model);
  assert.equal(legacy.fontSize, 18);
});

test("numeric commits clamp both ends and reject empty or nonfinite drafts", () => {
  assert.equal(normalizeNumber("", 1600, limits.maxTokens), 1600);
  assert.equal(normalizeNumber("Infinity", 1600, limits.maxTokens), 1600);
  assert.equal(normalizeNumber("NaN", 1600, limits.maxTokens), 1600);
  assert.equal(normalizeNumber("1", 1600, limits.maxTokens), 512);
  assert.equal(normalizeNumber("16384", 1600, limits.maxTokens), 8192);
  assert.equal(normalizeNumber("2048", 1600, limits.maxTokens), 2048);
  assert.equal(normalizeNumber("1234.8", 1600, limits.maxTokens), 1235);
});

test("budget estimates use the actual engine instructions and scenario, then reserve output", () => {
  const context = { player: "USA", action: "invest" };
  const messages = turnMessages("Prefer slow political change.", context);
  assert.ok(messages[0].content.startsWith(instructions));
  assert.ok(messages[0].content.includes("Prefer slow political change."));
  assert.equal(messages[1].content, JSON.stringify(context));
  const estimate = estimateTurnTokens(defaults, context);
  assert.ok(estimate > defaults.maxTokens + instructions.length / 3);
  assert.ok(estimateTurnTokens({ ...defaults, prompt: "Scenario detail. ".repeat(80) }, context) > estimate);
  assert.equal(estimateTurnTokens({ ...defaults, maxTokens: 8192 }, context) - estimate, 8192 - defaults.maxTokens);
});
