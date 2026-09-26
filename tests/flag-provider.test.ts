import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/flag/route";

const request = (provider: string) => new Request("http://localhost/api/flag", {
  method: "POST", headers: { origin: "http://localhost", "Content-Type": "application/json" },
  body: JSON.stringify({ provider, key: "test-key", model: "test-model", temperature: 0.5,
    maxTokens: 1024, prompt: "", description: "A simple blue and white flag" }),
});
const design = { shape: "rectangle_standard", background: "blue", layers: [
  { kind: "division", type: "horizontal_stripes", count: 2, colors: ["blue", "white"] },
] };

test("Claude flag generation uses Messages and normalizes the returned design", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const payload = JSON.parse(String(init?.body));
    assert.ok(payload.system.includes("flag"));
    assert.equal(payload.messages[0].role, "user");
    assert.equal(payload.max_tokens, 1024);
    return Response.json({ content: [{ type: "text", text: JSON.stringify(design) }],
      stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } });
  });
  const response = await POST(request("anthropic"));
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { design: { shape: { type: string } } }).design.shape.type, "rectangle");
});
