import { z } from "zod";
import { providerLabels, providerSchema, supportsTemperature, type Provider } from "./settings";

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
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  together: "https://api.together.xyz/v1/chat/completions",
  cohere: "https://api.cohere.ai/compatibility/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
};
export function providerEndpoint(provider: Provider) {
  return endpoints[provider];
}
export function providerHeaders(data: Connection) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!data.key) throw new ProviderError("Add an API key in Settings → API first.", 400);
  headers.Authorization = `Bearer ${data.key}`;
  if (data.provider === "anthropic") headers["anthropic-version"] = "2023-06-01";
  return headers;
}
export class ProviderError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export function providerError(status: number, provider: Provider) {
  if (status === 401) return "The provider rejected this API key. Update it in Settings → API.";
  if (status === 403) return "This key does not have access to the selected model. Check its permissions in your provider account.";
  if (status === 402) return "The provider has insufficient credits. Add credits in your provider account.";
  if (status === 404) return "This model is unavailable to your account. Check the Model ID in Settings → API.";
  if (status === 429) return "The provider rate limit or credit limit was reached. Try again later or check your provider account.";
  if (status === 400 || status === 422) return "The model rejected these generation settings. Check the Model ID, response limit and JSON-output support.";
  return `${providerLabels[provider]} returned ${status}. Try again later or check your provider account.`;
}
export async function fetchProvider(url: string, init: RequestInit, provider: Provider) {
  // Workers supports manual redirects, but rejects redirect: "error".
  // Reject every non-2xx below so credentials never follow a redirect.
  const response = await fetch(url, { ...init, cache: "no-store", redirect: "manual" });
  if (!response.ok) throw new ProviderError(providerError(response.status, provider));
  return response;
}
export function requestError(error: unknown) {
  if (error instanceof ProviderError) return { error: error.message, status: error.status };
  if (error instanceof Error && "status" in error && (error.status === 403 || error.status === 503))
    return { error: error.message, status: error.status };
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return { error: "Invalid request settings.", status: 400 };
  if (error instanceof Error && error.name === "TimeoutError")
    return { error: "The provider timed out. Your world has not changed. Try a smaller model or response limit.", status: 504 };
  if (error instanceof Error && error.name === "AbortError")
    return { error: "The request was cancelled. Your world has not changed.", status: 499 };
  return { error: "Cannot reach the provider. Check your connection and try again. Your world has not changed.", status: 502 };
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

export async function inspectProvider(data: Connection, signal: AbortSignal): Promise<ProviderInfo> {
  const headers = providerHeaders(data);
  if (data.provider === "openrouter") {
    // /models can be public; validate credentials separately without generating tokens.
    const response = await fetchProvider("https://openrouter.ai/api/v1/key", { headers, signal }, data.provider);
    z.object({ data: z.object({}) }).parse(await readProviderJson(response));
    return openRouterInfo(data, signal);
  }
  const modelBase: Record<Exclude<Provider, "openrouter">, string> = {
    openai: "https://api.openai.com/v1/models", anthropic: "https://api.anthropic.com/v1/models",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/models", groq: "https://api.groq.com/openai/v1/models",
    mistral: "https://api.mistral.ai/v1/models", xai: "https://api.x.ai/v1/models",
    deepseek: "https://api.deepseek.com/models", together: "https://api.together.xyz/v1/models",
    cohere: "https://api.cohere.ai/v1/models", cerebras: "https://api.cerebras.ai/v1/models",
  };
  const base = modelBase[data.provider];
  // Per-model retrieval verifies credentials and access without spending generation tokens.
  if (data.provider === "openai" || data.provider === "anthropic" || data.provider === "groq" || data.provider === "xai" || data.provider === "cohere") {
    const response = await fetchProvider(`${base}/${encodeURIComponent(data.model)}`, { headers, signal }, data.provider);
    const result = z.object({ id: z.string().optional(), name: z.string().optional() }).parse(await readProviderJson(response));
    if (result.id !== data.model && result.name !== data.model) throw new ProviderError("The provider returned a different model.", 502);
    return { models: [data.model], connected: true, temperature: supportsTemperature(data.provider, data.model), jsonOutput: data.provider !== "anthropic",
      message: "API key and model access verified. Generation requires available quota." };
  }
  const response = await fetchProvider(base, { headers, signal }, data.provider);
  const result = await readProviderJson(response, 16_000_000);
  const list = z.object({ data: z.array(z.object({ id: z.string() })).optional(), models: z.array(z.object({ name: z.string().optional(), id: z.string().optional() })).optional() }).parse(result);
  const models = (list.data?.map((item) => item.id) ?? list.models?.map((item) => item.id || item.name || "") ?? []).filter(Boolean);
  const connected = models.includes(data.model);
  return { models, connected, temperature: supportsTemperature(data.provider, data.model), jsonOutput: true,
    message: connected ? "API key and model access verified. Generation requires available quota." : "Model ID not found. Choose one of the available models." };
}

export type ChatMessage = { role: string; content: string };
export type ChatAnswer = { content?: string | null; finishReason?: string | null; refusal?: string | null; tokens?: number };

/** Claude requires max_tokens. This is a ceiling the current models accept when the user asked for no cap. */
const anthropicUnlimitedTokens = 64_000;

/** 0 removes this app's cap. Chat APIs then use their own default; Claude still needs a number. */
export function resolvedOutputTokens(maxTokens: number, provider: Provider, info?: ProviderInfo) {
  if (maxTokens > 0) return maxTokens;
  if (provider !== "anthropic") return undefined;
  return info?.maxOutputTokens ?? anthropicUnlimitedTokens;
}

/** Use Claude's Messages shape; the other public APIs expose Chat Completions. */
export function chatPayload(data: Connection & { maxTokens: number; temperature: number }, messages: ChatMessage[], info?: ProviderInfo) {
  const cap = resolvedOutputTokens(data.maxTokens, data.provider, info);
  if (data.provider === "anthropic") return {
    model: data.model, max_tokens: cap, temperature: Math.min(data.temperature, 1),
    system: messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n"),
    messages: messages.filter((message) => message.role !== "system"),
  };
  const payload: Record<string, unknown> = { model: data.model, messages };
  if (cap !== undefined) payload[data.provider === "openai" || data.provider === "cerebras" ? "max_completion_tokens" : "max_tokens"] = cap;
  if (data.provider === "deepseek") payload.thinking = { type: "disabled" };
  if (data.provider === "openrouter" ? info?.temperature : supportsTemperature(data.provider, data.model))
    payload.temperature = data.temperature;
  // JSON mode is model-dependent on routed providers. The prompt and server validation remain authoritative.
  if (data.provider === "openai" || data.provider === "mistral" || data.provider === "deepseek" ||
    (data.provider === "openrouter" && info?.jsonOutput)) payload.response_format = { type: "json_object" };
  return payload;
}

const count = z.number().int().nonnegative().safe();
const completionAnswer = z.object({
  choices: z.array(z.object({ finish_reason: z.string().nullish(), message: z.object({
    content: z.string().nullish(), refusal: z.string().nullish(),
  }).optional() })).min(1),
  usage: z.object({ total_tokens: count.optional(), prompt_tokens: count.optional(), completion_tokens: count.optional() }).optional(),
});
const claudeAnswer = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullish(),
  usage: z.object({ input_tokens: count, output_tokens: count }),
});
export function parseChatAnswer(provider: Provider, raw: unknown): ChatAnswer | null {
  if (provider === "anthropic") {
    const result = claudeAnswer.safeParse(raw);
    if (!result.success) return null;
    return { content: result.data.content.filter((part) => part.type === "text").map((part) => part.text || "").join(""),
      finishReason: result.data.stop_reason, tokens: result.data.usage.input_tokens + result.data.usage.output_tokens };
  }
  const result = completionAnswer.safeParse(raw);
  if (!result.success) return null;
  const choice = result.data.choices[0];
  const usage = result.data.usage;
  return { content: choice.message?.content, finishReason: choice.finish_reason, refusal: choice.message?.refusal,
    tokens: usage?.total_tokens ?? (usage?.prompt_tokens !== undefined && usage.completion_tokens !== undefined
      ? usage.prompt_tokens + usage.completion_tokens : undefined) };
}
