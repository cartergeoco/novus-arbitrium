// Local auth proxy. Bind loopback only. Tailscale Funnel publishes this port, never 11434.
import { createHash, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";

const port = Number(process.env.OLLAMA_GATEWAY_PORT || 11435);
const upstream = new URL(process.env.OLLAMA_UPSTREAM || "http://127.0.0.1:11434");
const token = process.env.OLLAMA_TOKEN?.trim();
const routes = new Set(["GET /api/tags", "POST /api/show", "POST /api/chat"]);
const maxRequestBytes = 2_000_000;
const maxResponseBytes = 8_000_000;

if (!token || token.length < 32 || !Number.isInteger(port) || port < 1 || port > 65535 ||
    upstream.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(upstream.hostname) ||
    upstream.username || upstream.password || upstream.pathname !== "/" || upstream.search || upstream.hash) {
  console.error("Set a 32+ character OLLAMA_TOKEN, a valid port, and a loopback HTTP OLLAMA_UPSTREAM.");
  process.exit(1);
}

const hash = (value) => createHash("sha256").update(value).digest();
const expected = hash(token);
const send = (response, status, message) => {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify({ error: message }));
};

const server = createServer(async (request, response) => {
  const authorization = request.headers.authorization || "";
  const presented = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!timingSafeEqual(expected, hash(presented))) return send(response, 401, "Unauthorized");
  const path = request.url || "/";
  if (path.includes("?") || !routes.has(`${request.method} ${path}`)) return send(response, 404, "Not found");
  if (request.method === "POST" && !/^application\/json(?:\s*;|\s*$)/i.test(request.headers["content-type"] || ""))
    return send(response, 415, "JSON required");
  if (Number(request.headers["content-length"] || 0) > maxRequestBytes) return send(response, 413, "Request too large");

  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > maxRequestBytes) return send(response, 413, "Request too large");
      chunks.push(chunk);
    }
    const upstreamResponse = await fetch(new URL(path, upstream), {
      method: request.method,
      headers: { "content-type": "application/json" },
      body: request.method === "POST" ? Buffer.concat(chunks) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(190_000),
    });
    const declared = Number(upstreamResponse.headers.get("content-length") || 0);
    if (declared > maxResponseBytes) return send(response, 502, "Ollama response too large");
    // Do not expose upstream headers (including cookies or redirects) to the public gateway.
    response.writeHead(upstreamResponse.status, {
      "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff",
    });
    if (!upstreamResponse.body) return response.end();
    let responseSize = 0;
    for await (const chunk of upstreamResponse.body) {
      responseSize += chunk.length;
      if (responseSize > maxResponseBytes) { response.destroy(); return; }
      if (!response.write(chunk)) await once(response, "drain");
    }
    response.end();
  } catch {
    if (!response.headersSent) send(response, 502, "Ollama is not reachable on this computer.");
    else response.destroy();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Ollama gateway listening on 127.0.0.1:${port}`);
});
