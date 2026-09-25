import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

test("Ollama gateway authenticates and forwards only bounded chat operations", async (t) => {
  const seen: string[] = [];
  const upstream = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk.toString();
    seen.push(`${request.method} ${request.url} ${body}`.trim());
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ models: [] }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  t.after(() => upstream.close());
  const reserve = createServer();
  await new Promise<void>((resolve) => reserve.listen(0, "127.0.0.1", resolve));
  const port = (reserve.address() as AddressInfo).port;
  await new Promise<void>((resolve) => reserve.close(() => resolve()));

  const token = "gateway-test-token-with-more-than-32-characters";
  const child = spawn(process.execPath, ["scripts/ollama-gateway.mjs"], {
    cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, OLLAMA_GATEWAY_PORT: String(port), OLLAMA_UPSTREAM: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`, OLLAMA_TOKEN: token },
  });
  t.after(() => child.kill());
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error("Gateway did not start")), 5000);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("gateway listening")) { clearTimeout(timeout); resolve(); }
    });
    child.on("exit", (code) => { clearTimeout(timeout); reject(Error(`Gateway exited with ${code}`)); });
  });

  const base = `http://127.0.0.1:${port}`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  assert.equal((await fetch(`${base}/api/tags`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/api/chat`, { method: "POST", headers, body: "{}" })).status, 200);
  assert.equal((await fetch(`${base}/api/pull`, { method: "POST", headers, body: "{}" })).status, 404);
  assert.equal((await fetch(`${base}/api/chat`, { method: "POST", headers: { ...headers, authorization: "Bearer wrong" }, body: "{}" })).status, 401);
  assert.equal((await fetch(`${base}/api/chat`, { method: "POST", headers, body: " ".repeat(250_001) })).status, 413);
  assert.deepEqual(seen, ["GET /api/tags", "POST /api/chat {}"]);
});
