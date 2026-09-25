import { z } from "zod";
import { providerSchema, supportsTemperature, type Provider } from "./settings";

export const connectionSchema = z.object({
  provider: providerSchema,
  key: z.string().trim().max(512).refine((key) => !/[\r\n]/.test(key)).optional(),
  model: z.string().trim().min(1).max(120),
});
export type Connection = z.infer<typeof connectionSchema>;
export type ProviderInfo = {
  models: string[];
  connected: boolean;
  message: string;
  temperature: boolean;
  jsonOutput?: boolean;
  contextLength?: number;
  maxOutputTokens?: number;
};
export const endpoints: Record<Provider, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  ollama: "http://127.0.0.1:11434/api/chat",
};
/** Server-only. Local Ollama stays on loopback. A remote endpoint must be HTTPS and is never sent to the browser. */
export function ollamaBase() {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  if (!raw) return "http://127.0.0.1:11434";
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new ProviderError("OLLAMA_BASE_URL is not a valid URL.", 500); }
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!local && url.protocol !== "https:") throw new ProviderError("The private Ollama endpoint must use HTTPS.", 500);
  if (url.username || url.password) throw new ProviderError("Put the Ollama credential in OLLAMA_TOKEN, not in the URL.", 500);
  if (url.search || url.hash) throw new ProviderError("OLLAMA_BASE_URL cannot contain a query or fragment.", 500);
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}
function remoteOllama() {
  const { hostname } = new URL(ollamaBase());
  return hostname !== "127.0.0.1" && hostname !== "localhost";
}
/** A public deployment must never spend server-side Ollama resources for an anonymous caller. */
export async function authorizeProvider(data: Connection) {
  if (data.provider !== "ollama" || (!remoteOllama() && process.env.NODE_ENV !== "production")) return;
  const secret = process.env.OLLAMA_CLIENT_KEY?.trim();
  if (!secret || secret.length < 32)
    throw new ProviderError("Ollama is unavailable until the server has an OLLAMA_CLIENT_KEY of at least 32 characters.", 503);
  if (!data.key) throw new ProviderError("Enter the Ollama access key in Settings → API.", 403);
  // Compare fixed-length digests so the comparison does not reveal a matching prefix.
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [expected, actual] = await Promise.all([digest(secret), digest(data.key)]);
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ actual[i];
  if (mismatch) throw new ProviderError("Ollama access key rejected.", 403);
}
export function ollamaUrl(path: "/api/chat" | "/api/tags" | "/api/show") {
  return `${ollamaBase()}${path}`;
}
export function providerEndpoint(provider: Provider) {
  return provider === "ollama" ? ollamaUrl("/api/chat") : endpoints[provider];
}
export function providerHeaders(data: Connection) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.provider === "ollama") {
    const remote = remoteOllama();
    const token = process.env.OLLAMA_TOKEN?.trim();
    if (remote && !token) throw new ProviderError("The server is missing OLLAMA_TOKEN for the private Ollama endpoint.", 500);
    if (remote && token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  if (!data.key) throw new ProviderError("Add an API key in Settings → API first.", 400);
  headers.Authorization = `Bearer ${data.key}`;
  return headers;
}
export class ProviderError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export function providerError(status: number, provider: Provider) {
  if (status === 401) return "The provider rejected this API key. Update it in Settings → API.";
  if (status === 403) return "This key does not have access to the selected model. Check its permissions in your provider account.";
  if (status === 402) return "The provider has insufficient credits. Add credits in your provider account.";
  if (status === 404) return provider === "ollama"
    ? "This Ollama model is not installed. Select an installed model in Settings → API or pull it with Ollama first."
    : "This model is unavailable to your account. Check the Model ID in Settings → API.";
  if (status === 429) return "The provider rate limit or credit limit was reached. Try again later or check your provider account.";
  if (status === 400 || status === 422) return "The model rejected these generation settings. Check the Model ID, response limit and JSON-output support.";
  return `The provider returned ${status}. Try again later or check your provider account.`;
}
export async function fetchProvider(url: string, init: RequestInit, provider: Provider) {
  // Workers supports manual redirects, but rejects redirect: "error".
  // Reject every non-2xx below so credentials never follow a redirect.
  const response = await fetch(url, { ...init, cache: "no-store", redirect: "manual" });
  if (!response.ok) throw new ProviderError(providerError(response.status, provider));
  return response;
}
export function requestError(error: unknown, provider?: Provider) {
  if (error instanceof ProviderError) return { error: error.message, status: error.status };
  if (error instanceof Error && "status" in error && (error.status === 403 || error.status === 503))
    return { error: error.message, status: error.status };
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return { error: "Invalid request settings.", status: 400 };
  if (error instanceof Error && error.name === "TimeoutError")
    return { error: "The provider timed out. Your world has not changed. Try a smaller model or response limit.", status: 504 };
  if (error instanceof Error && error.name === "AbortError")
    return { error: "The request was cancelled. Your world has not changed.", status: 499 };
  return { error: provider === "ollama"
    ? "Cannot reach Ollama. Locally, start Ollama on 127.0.0.1:11434. On the deployed site, the private endpoint and the gateway on your computer must both be running."
    : "Cannot reach the provider. Check your connection and try again. Your world has not changed.", status: 502 };
}
export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ProviderError("Origin not allowed.", 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    throw new ProviderError("Cross-site requests are not allowed.", 403);
}
async function boundedText(stream: ReadableStream<Uint8Array> | null, contentLength: string | null, maxBytes: number, message: string, status: number) {
  if (contentLength && Number(contentLength) > maxBytes) throw new ProviderError(message, status);
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ProviderError(message, status);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
export async function readJsonRequest(request: Request, maxBytes: number) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || ""))
    throw new ProviderError("Send JSON with Content-Type: application/json.", 415);
  const text = await boundedText(request.body, request.headers.get("content-length"), maxBytes, "Request is too large.", 413);
  return JSON.parse(text) as unknown;
}
export async function readProviderJson(response: Response, maxBytes = 8_000_000) {
  const text = await boundedText(response.body, response.headers.get("content-length"), maxBytes, "The provider response is too large.", 502);
  try { return JSON.parse(text) as unknown; }
  catch { throw new ProviderError("The provider returned invalid JSON.", 502); }
}
const positive = z.number().int().positive().nullish();
const routerModels = z.object({ data: z.array(z.object({
  id: z.string(), supported_parameters: z.array(z.string()).optional(),
  context_length: positive,
  top_provider: z.object({ max_completion_tokens: positive }).nullish(),
})) });

export async function openRouterInfo(data: Connection, signal: AbortSignal): Promise<ProviderInfo> {
  const response = await fetchProvider("https://openrouter.ai/api/v1/models", {
    headers: providerHeaders(data), signal,
  }, "openrouter");
  const { data: models } = routerModels.parse(await readProviderJson(response, 16_000_000));
  const selected = models.find((model) => model.id === data.model);
  return {
    models: models.map((model) => model.id), connected: !!selected,
    message: selected ? "Model listed by OpenRouter. Generation remains subject to provider access and credits."
      : "Model ID not found on OpenRouter. Choose a model from the available suggestions.",
    temperature: selected?.supported_parameters?.includes("temperature") ?? supportsTemperature("openrouter", data.model),
    jsonOutput: selected?.supported_parameters?.includes("response_format") ?? false,
    contextLength: selected?.context_length ?? undefined,
    maxOutputTokens: selected?.top_provider?.max_completion_tokens ?? undefined,
  };
}

const ollamaName = (name: string) => name.includes(":") ? name : `${name}:latest`;
export async function inspectProvider(data: Connection, signal: AbortSignal): Promise<ProviderInfo> {
  const headers = providerHeaders(data);
  if (data.provider === "ollama") {
    const response = await fetchProvider(ollamaUrl("/api/tags"), { headers, signal }, "ollama");
    const list = z.object({ models: z.array(z.object({
      name: z.string(), capabilities: z.array(z.string()).optional(),
    })) }).parse(await readProviderJson(response)).models;
    const models = list.filter((model) => !model.capabilities || model.capabilities.includes("completion")).map((model) => model.name);
    const connected = models.some((name) => ollamaName(name) === ollamaName(data.model));
    return { models, connected, temperature: true, jsonOutput: true,
      message: connected ? "Ollama is reachable and this model is installed."
        : models.length ? `Model not installed. Available: ${models.slice(0, 6).join(", ")}.`
          : "No chat models are installed. Pull a model with Ollama, then enter its name here.",
    };
  }
  if (data.provider === "openrouter") {
    // /models can be public; validate credentials separately without generating tokens.
    const response = await fetchProvider("https://openrouter.ai/api/v1/key", { headers, signal }, data.provider);
    z.object({ data: z.object({}) }).parse(await readProviderJson(response));
    return openRouterInfo(data, signal);
  }
  const response = await fetchProvider(`https://api.openai.com/v1/models/${encodeURIComponent(data.model)}`, { headers, signal }, data.provider);
  z.object({ id: z.string() }).parse(await readProviderJson(response));
  return { models: [data.model], connected: true, temperature: supportsTemperature(data.provider, data.model), jsonOutput: true,
    message: "API key and model access verified. Use a Chat Completions model with JSON output; generation requires available quota.",
  };
}

export async function ollamaContextLength(data: Connection, signal: AbortSignal) {
  const response = await fetchProvider(ollamaUrl("/api/show"), {
    method: "POST", headers: providerHeaders(data), signal, body: JSON.stringify({ model: data.model }),
  }, "ollama");
  const info = z.object({ capabilities: z.array(z.string()).optional(), model_info: z.record(z.unknown()).optional() }).parse(await readProviderJson(response));
  if (info.capabilities && !info.capabilities.includes("completion"))
    throw new ProviderError("Select an Ollama model that supports chat completion in Settings → API.", 400);
  return Object.entries(info.model_info || {}).find(([key, value]) => key.endsWith(".context_length") && typeof value === "number")?.[1] as number | undefined;
}
