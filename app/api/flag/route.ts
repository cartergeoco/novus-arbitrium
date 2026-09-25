import { z } from "zod";
import { flagPromptGuide } from "@/lib/flag/catalog";
import { normalizeFlag } from "@/lib/flag/normalize";
import { requireBrowserCheck } from "@/lib/browser-check";
import { generationFields, supportsTemperature, type Provider } from "@/lib/settings";
import {
  authorizeProvider, checkOrigin, connectionSchema, fetchProvider, jsonResponse, openRouterInfo, ProviderError, providerEndpoint, providerHeaders, readJsonRequest, readProviderJson, requestError,
} from "@/lib/providers";

const input = connectionSchema.extend({
  ...generationFields,
  description: z.string().trim().min(1).max(800),
  current: z.unknown().optional(),
});

const answerSchema = z.object({
  choices: z.array(z.object({ finish_reason: z.string().nullish(), message: z.object({ content: z.string().nullish() }).optional() })).optional(),
  message: z.object({ content: z.string().nullish() }).optional(),
});

const system = `You design flags for a strategy game by composing parts from a component library. You never draw; you choose and configure components.
${flagPromptGuide("full")}
Return ONLY one JSON object in the flag format above: {"shape":...,"background":...,"layers":[...]}. Prefer real proportions and restrained palettes (2–4 colors). Use library emblems for animals, weapons, buildings, regalia and national arms.`;

/** Describe-to-flag: the model returns a design, which is normalized before it reaches the client. */
export async function POST(request: Request) {
  let provider: Provider | undefined;
  try {
    checkOrigin(request);
    await requireBrowserCheck(request);
    const data = input.parse(await readJsonRequest(request, 40000));
    provider = data.provider;
    await authorizeProvider(data);
    const current = data.current ? normalizeFlag(data.current).design : undefined;
    const messages = [
      { role: "system", content: system },
      { role: "user", content: current ? `Current flag:\n${JSON.stringify(current)}\nChange it as follows: ${data.description}` : `Design this flag: ${data.description}` },
    ];
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(provider === "ollama" ? 120000 : 60000)]);
    const payload: Record<string, unknown> = { model: data.model, messages };
    if (provider === "ollama") {
      payload.stream = false;
      payload.format = "json";
      payload.options = { temperature: data.temperature, num_predict: data.maxTokens, num_ctx: 16384 };
    } else if (provider === "openrouter") {
      const info = await openRouterInfo(data, signal);
      if (!info.connected) throw new ProviderError(info.message, 400);
      payload.max_tokens = data.maxTokens;
      if (info.temperature) payload.temperature = data.temperature;
      if (info.jsonOutput) payload.response_format = { type: "json_object" };
    } else {
      payload.max_completion_tokens = data.maxTokens;
      payload.response_format = { type: "json_object" };
      if (supportsTemperature(provider, data.model)) payload.temperature = data.temperature;
    }
    const response = await fetchProvider(providerEndpoint(provider), { method: "POST", headers: providerHeaders(data), body: JSON.stringify(payload), signal }, provider);
    const answer = answerSchema.safeParse(await readProviderJson(response));
    if (!answer.success) return jsonResponse({ error: "The provider returned an invalid response." }, 502);
    const content = provider === "ollama" ? answer.data.message?.content : answer.data.choices?.[0]?.message?.content;
    if (!content?.trim()) return jsonResponse({ error: "The model returned no flag. Increase the response limit or choose another model." }, 422);
    let decoded: unknown;
    try { decoded = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); }
    catch { return jsonResponse({ error: "The model returned invalid JSON." }, 422); }
    const value = decoded && typeof decoded === "object" && "flag" in decoded ? (decoded as { flag: unknown }).flag : decoded;
    const result = normalizeFlag(value);
    if (!result.ok) return jsonResponse({ error: "The model's flag used no recognizable components.", issues: result.issues }, 422);
    return jsonResponse({ design: result.design, issues: result.issues });
  } catch (error) {
    const failure = requestError(error, provider);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
