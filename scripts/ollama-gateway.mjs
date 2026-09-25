// Local auth proxy. Bind loopback only. Tailscale Funnel publishes this port, never 11434.
import { createServer } from "node:http";

const port = Number(process.env.OLLAMA_GATEWAY_PORT || 11435);
const upstream = new URL(process.env.OLLAMA_UPSTREAM || "http://127.0.0.1:11434");
const token = process.env.OLLAMA_TOKEN?.trim();

if (!token) {
  console.error("OLLAMA_TOKEN is required. Copy .env.example and set it in .env.ollama.local.");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  const header = request.headers.authorization || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (presented.length !== token.length || !timingSafeEqual(presented, token)) {
    response.writeHead(401, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  const path = request.url?.split("?")[0] || "/";
  if (!path.startsWith("/api/")) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : Buffer.from(await request.arrayBuffer());
  try {
    const upstreamResponse = await fetch(new URL(request.url || "/", upstream), {
      method: request.method,
      headers: { "content-type": request.headers["content-type"] || "application/json" },
      body,
    });
    response.writeHead(upstreamResponse.status, {
      "content-type": upstreamResponse.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    });
    if (!upstreamResponse.body) {
      response.end();
      return;
    }
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(value);
    }
    response.end();
  } catch {
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Ollama is not reachable on this computer." }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Ollama gateway listening on 127.0.0.1:${port}`);
});

function timingSafeEqual(a, b) {
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
