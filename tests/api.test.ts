import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/turn/route";
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
  globalThis.fetch = async (url, init) => {
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
    assert.equal(((await res.json()) as any).tokens, 47);
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
    const body = (await res.json()) as any;
    assert.equal(body.tokens, 19);
    assert.equal(body.result, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
