import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/provider/route";
import { endpoints, providerHeaders } from "../lib/providers";
import { providerDefaults, providerSchema } from "../lib/settings";

const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/provider", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("provider checks reject foreign origins, removed providers, missing keys and blank models", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw Error("Must not fetch"); });
  const body = { provider: "openai", model: "gpt-4.1-mini" };
  assert.equal((await POST(request(body, "https://foreign.example"))).status, 403);
  assert.equal((await POST(request(body))).status, 400);
  assert.equal((await POST(request({ ...body, model: "  " }))).status, 400);
  assert.equal((await POST(request({ ...body, provider: "ollama", key: "key" }))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("public providers have fixed HTTPS endpoints and send only the selected tab key", () => {
  for (const provider of providerSchema.options) {
    assert.match(endpoints[provider], /^https:\/\//);
    assert.equal(new Headers(providerHeaders({ provider, model: providerDefaults[provider], key: "only-this-key" })).get("authorization"), "Bearer only-this-key");
  }
  assert.equal(providerHeaders({ provider: "anthropic", model: "claude-sonnet-4-6", key: "key" })["anthropic-version"], "2023-06-01");
});

test("OpenAI and Claude verify key and model access without generation", async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(url));
    assert.equal(init?.body, undefined);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-key");
    return Response.json({ id: String(url).split("/").at(-1) });
  });
  for (const [provider, model] of [["openai", "gpt-4.1-mini"], ["anthropic", "claude-sonnet-4-6"]]) {
    const response = await POST(request({ provider, model, key: "test-key" }));
    assert.equal((await response.json() as { connected: boolean }).connected, true);
  }
  assert.deepEqual(urls, ["https://api.openai.com/v1/models/gpt-4.1-mini", "https://api.anthropic.com/v1/models/claude-sonnet-4-6"]);
});

test("catalog-based providers validate the key and selected model", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => {
    assert.equal(url, "https://api.mistral.ai/v1/models");
    return Response.json({ data: [{ id: "mistral-large-latest" }] });
  });
  const available = await POST(request({ provider: "mistral", model: "mistral-large-latest", key: "key" }));
  assert.equal((await available.json() as { connected: boolean }).connected, true);
  const unavailable = await POST(request({ provider: "mistral", model: "unknown", key: "key" }));
  assert.equal((await unavailable.json() as { connected: boolean }).connected, false);
});

test("OpenRouter validates the key separately from its public model catalog", async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(url));
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer router-test-key");
    if (String(url).endsWith("/key")) return Response.json({ data: { label: "test" } });
    return Response.json({ data: [{ id: "test/model", supported_parameters: ["response_format"], context_length: 16384,
      top_provider: { max_completion_tokens: 4096 } }] });
  });
  const response = await POST(request({ provider: "openrouter", key: "router-test-key", model: "test/model" }));
  const body = await response.json() as { connected: boolean; temperature: boolean; maxOutputTokens: number };
  assert.equal(body.connected, true);
  assert.equal(body.temperature, false);
  assert.equal(body.maxOutputTokens, 4096);
  assert.deepEqual(urls, ["https://openrouter.ai/api/v1/key", "https://openrouter.ai/api/v1/models"]);
});

test("a rejected key cannot be reported as connected or leak upstream error details", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "sensitive upstream detail" }, { status: 401 }));
  const response = await POST(request({ provider: "groq", model: "llama-3.3-70b-versatile", key: "fake-key" }));
  const body = await response.json() as { error: string };
  assert.equal(response.status, 502);
  assert.match(body.error, /rejected this API key/);
  assert.ok(!JSON.stringify(body).includes("sensitive"));
});
