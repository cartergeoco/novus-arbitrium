import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/provider/route";

const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/provider", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("provider checks reject foreign origins, missing keys and whitespace-only models without fetching", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw Error("Must not fetch"); });
  const body = { provider: "openai", model: "gpt-4.1-mini" };
  assert.equal((await POST(request(body, "https://foreign.example"))).status, 403);
  assert.equal((await POST(request(body))).status, 400);
  assert.equal((await POST(request({ ...body, model: "  " }))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("Ollama checks the server's installed models, accepts latest aliases and never forwards keys", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "http://127.0.0.1:11434/api/tags");
    assert.equal(new Headers(init?.headers).get("authorization"), null);
    return Response.json({ models: [{ name: "custom:latest" }, { name: "embed:latest", capabilities: ["embedding"] }] });
  });
  const present = await POST(request({ provider: "ollama", model: " custom ", key: "never-send" }));
  assert.equal(present.status, 200);
  assert.equal(present.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await present.json(), { models: ["custom:latest"], connected: true, temperature: true,
    jsonOutput: true, message: "Ollama is reachable and this model is installed." });
  const absent = await POST(request({ provider: "ollama", model: "missing" }));
  const body = await absent.json() as { connected: boolean; message: string; models: string[] };
  assert.equal(body.connected, false);
  assert.match(body.message, /custom:latest/);
});

test("OpenAI verifies actual key/model access with no generation request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/models/gpt-4.1-mini");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-key");
    assert.equal(init?.body, undefined);
    return Response.json({ id: "gpt-4.1-mini" });
  });
  const response = await POST(request({ provider: "openai", model: "gpt-4.1-mini", key: " test-key " }));
  assert.equal((await response.json() as { connected: boolean }).connected, true);
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

test("a rejected key cannot be reported as connected or leak provider error details", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "sensitive upstream detail" }, { status: 401 }));
  const response = await POST(request({ provider: "openrouter", model: "test/model", key: "fake-key" }));
  const body = await response.json() as { error: string };
  assert.equal(response.status, 502);
  assert.match(body.error, /rejected this API key/);
  assert.ok(!JSON.stringify(body).includes("sensitive"));
  assert.equal(fetch.mock.callCount(), 1);
});
