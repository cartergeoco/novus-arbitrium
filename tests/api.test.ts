import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/turn/route";
import { estimateTurnTokens } from "../lib/generation";
import { endpoints } from "../lib/providers";
import { providerDefaults, providerSchema } from "../lib/settings";
const request = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/turn", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const valid = {
  provider: "openai",
  key: "test-only-placeholder",
  model: "test-model",
  temperature: 0.5,
  maxTokens: 1024,
  prompt: "",
  context: { player: "USA", action: "invest" },
};
test("API rejects foreign origins and invalid settings before contacting a provider", async () => {
  assert.equal(
    (await POST(request(valid, "https://foreign.example"))).status,
    403,
  );
  assert.equal(
    (await POST(request({ ...valid, provider: "unknown" }))).status,
    400,
  );
});
test("API validates provider JSON and returns reported usage", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_completion_tokens, 1024);
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Reform",
              summary: "A valid turn.",
              category: "Domestic",
              effects: [],
              headlines: [],
              territories: [],
            }),
          },
        },
      ],
      usage: { total_tokens: 47 },
    });
  };
  try {
    const res = await POST(request(valid));
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { tokens: number }).tokens, 47);
  } finally {
    globalThis.fetch = original;
  }
});
test("malformed provider output fails without a fabricated result", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      choices: [{ message: { content: '{"title":"Incomplete"}' } }],
      usage: { total_tokens: 19 },
    });
  try {
    const res = await POST(request(valid));
    assert.equal(res.status, 422);
    const body = (await res.json()) as { tokens: number; result?: unknown };
    assert.equal(body.tokens, 19);
    assert.equal(body.result, undefined);
  } finally {
    globalThis.fetch = original;
  }
});

const turn = { title: "Reform", summary: "A valid turn.", category: "Domestic", effects: [], headlines: [], territories: [] };
const completion = (content: string = JSON.stringify(turn), usage: unknown = { total_tokens: 47 }, finish_reason = "stop") =>
  Response.json({ choices: [{ message: { content }, finish_reason }], ...(usage ? { usage } : {}) });

test("generation rejects invalid limits before making provider calls", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw Error("Must not fetch"); });
  for (const settings of [{ temperature: 1.6 }, { maxTokens: 8193 }, { maxTokens: 512.5 }, { model: " " },
    { key: "  " }]) {
    assert.equal((await POST(request({ ...valid, ...settings }))).status, 400);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("OpenAI sends the actual scenario, context and supported temperature with trimmed credentials", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-4.1-mini");
    assert.equal(body.temperature, 0);
    assert.equal(body.max_completion_tokens, 2048);
    assert.equal(body.max_tokens, undefined);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.ok(body.messages[0].content.includes("Slow and realistic change."));
    assert.deepEqual(JSON.parse(body.messages[1].content), valid.context);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-only-placeholder");
    assert.equal(body.key, undefined);
    return completion();
  });
  assert.equal((await POST(request({ ...valid, model: " gpt-4.1-mini ", key: ` ${valid.key} `,
    prompt: "Slow and realistic change.", maxTokens: 2048, temperature: 0 }))).status, 200);
});

test("a response limit of zero removes the cap instead of clamping it", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_completion_tokens, undefined);
    assert.equal(body.max_tokens, undefined);
    return completion();
  });
  assert.equal((await POST(request({ ...valid, maxTokens: 0 }))).status, 200);
});

test("Claude still sends a high ceiling when the response limit is unlimited", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 64000);
    return Response.json({ content: [{ type: "text", text: JSON.stringify(turn) }], stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 10 } });
  });
  assert.equal((await POST(request({ ...valid, provider: "anthropic", model: "claude-sonnet-4-6", maxTokens: 0 }))).status, 200);
});

test("reasoning models omit unsupported sampling instead of rejecting the saved temperature", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.temperature, undefined);
    assert.equal(body.max_completion_tokens, 1024);
    return completion();
  });
  for (const model of ["gpt-5", "gpt-5.1", "o3-mini", "o4-mini"])
    assert.equal((await POST(request({ ...valid, model }))).status, 200);
});

test("Claude uses native Messages with separate system instructions and reports usage", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(new Headers(init?.headers).get("anthropic-version"), "2023-06-01");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 1024);
    assert.equal(body.messages[0].role, "user");
    assert.ok(body.system.includes("JSON"));
    assert.equal(body.response_format, undefined);
    return Response.json({ content: [{ type: "text", text: JSON.stringify(turn) }], stop_reason: "end_turn",
      usage: { input_tokens: 123, output_tokens: 45 } });
  });
  const response = await POST(request({ ...valid, provider: "anthropic", model: "claude-sonnet-4-6" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { tokens: number }).tokens, 168);
});

test("each direct public provider reaches its own chat endpoint with a valid turn", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(String(url));
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${valid.key}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_completion_tokens ?? body.max_tokens, valid.maxTokens);
    if (String(url) === endpoints.deepseek) assert.deepEqual(body.thinking, { type: "disabled" });
    return completion();
  });
  const providers = providerSchema.options.filter((provider) => provider !== "openrouter" && provider !== "anthropic");
  for (const provider of providers)
    assert.equal((await POST(request({ ...valid, provider, model: providerDefaults[provider] }))).status, 200, provider);
  assert.deepEqual(calls, providers.map((provider) => endpoints[provider]));
});

test("OpenRouter sends only supported generation parameters with its own endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/models")) return Response.json({ data: [{ id: "vendor/model", supported_parameters: ["max_tokens"],
      context_length: 32768, top_provider: { max_completion_tokens: 2048 } }] });
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${valid.key}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 1024);
    assert.equal(body.temperature, undefined);
    assert.equal(body.response_format, undefined);
    assert.ok(body.messages[0].content.includes("JSON"));
    return completion();
  });
  assert.equal((await POST(request({ ...valid, provider: "openrouter", model: "vendor/model" }))).status, 200);
});

test("OpenRouter rejects unavailable models and excessive model-specific output limits", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ data: [{ id: "vendor/model", top_provider: { max_completion_tokens: 512 } }] }));
  assert.equal((await POST(request({ ...valid, provider: "openrouter", model: "missing/model" }))).status, 400);
  const response = await POST(request({ ...valid, provider: "openrouter", model: "vendor/model" }));
  assert.equal(response.status, 400);
  assert.match((await response.json() as { error: string }).error, /512 output tokens/);
  assert.equal(fetch.mock.callCount(), 2);
});

test("invalid JSON, truncated and empty responses preserve reported usage without advancing the world", async (t) => {
  let variant = 0;
  t.mock.method(globalThis, "fetch", async () => [
    completion("not JSON"), completion(JSON.stringify(turn), { total_tokens: 47 }, "length"), completion(""),
  ][variant++]);
  for (const expected of [/invalid JSON/, /token limit/, /no turn/]) {
    const response = await POST(request(valid));
    const body = await response.json() as { error: string; tokens: number; result?: unknown };
    assert.equal(response.status, 422);
    assert.match(body.error, expected);
    assert.equal(body.tokens, 47);
    assert.equal(body.result, undefined);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("providers without usage still report a conservative token estimate", async (t) => {
  t.mock.method(globalThis, "fetch", async () => completion(JSON.stringify(turn), null));
  const response = await POST(request(valid));
  const body = await response.json() as { tokens: number; usageEstimated: boolean };
  assert.equal(response.status, 200);
  assert.ok(body.tokens >= estimateTurnTokens(valid, valid.context));
  assert.equal(body.usageEstimated, true);
});

test("timeouts, unreachable providers and rejected keys return actionable errors", async (t) => {
  let mode = "timeout";
  t.mock.method(globalThis, "fetch", async () => {
    if (mode === "timeout") throw new DOMException("test timeout", "TimeoutError");
    if (mode === "offline") throw new TypeError("fetch failed");
    return Response.json({ error: "upstream detail" }, { status: 401 });
  });
  assert.equal((await POST(request(valid))).status, 504);
  mode = "offline";
  const offline = await POST(request({ ...valid, provider: "groq" }));
  assert.match((await offline.json() as { error: string }).error, /Cannot reach the provider/);
  mode = "key";
  const rejected = await POST(request(valid));
  assert.match((await rejected.json() as { error: string }).error, /rejected this API key/);
});
