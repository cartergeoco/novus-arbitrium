import { z } from "zod";
import { flagPromptGuide } from "@/lib/flag/catalog";
import { normalizeFlag } from "@/lib/flag/normalize";
import { requireBrowserCheck } from "@/lib/browser-check";
import { generationFields, type Provider } from "@/lib/settings";
import {
  chatPayload, checkOrigin, connectionSchema, fetchProvider, jsonResponse, openRouterInfo, parseChatAnswer, ProviderError, providerEndpoint, providerHeaders, readJsonRequest, readProviderJson, requestError,
} from "@/lib/providers";

const input = connectionSchema.extend({
  ...generationFields,
  description: z.string().trim().min(1).max(800),
  current: z.unknown().optional(),
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
    const current = data.current ? normalizeFlag(data.current).design : undefined;
    const messages = [
      { role: "system", content: system },
      { role: "user", content: current ? `Current flag:\n${JSON.stringify(current)}\nChange it as follows: ${data.description}` : `Design this flag: ${data.description}` },
    ];
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
    let info;
    if (provider === "openrouter") {
      info = await openRouterInfo(data, signal);
      if (!info.connected) throw new ProviderError(info.message, 400);
    }
    const payload = chatPayload(data, messages, info);
    const response = await fetchProvider(providerEndpoint(provider), { method: "POST", headers: providerHeaders(data), body: JSON.stringify(payload), signal }, provider);
    const answer = parseChatAnswer(provider, await readProviderJson(response));
    if (!answer) return jsonResponse({ error: "The provider returned an invalid response." }, 502);
    const content = answer.content;
    if (answer.finishReason === "length" || answer.finishReason === "max_tokens")
      return jsonResponse({ error: "The flag response reached the token limit. Increase it in Generation." }, 422);
    if (!content?.trim()) return jsonResponse({ error: "The model returned no flag. Increase the response limit or choose another model." }, 422);
    let decoded: unknown;
    try { decoded = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); }
    catch { return jsonResponse({ error: "The model returned invalid JSON." }, 422); }
    const value = decoded && typeof decoded === "object" && "flag" in decoded ? (decoded as { flag: unknown }).flag : decoded;
    const result = normalizeFlag(value);
    if (!result.ok) return jsonResponse({ error: "The model's flag used no recognizable components.", issues: result.issues }, 422);
    return jsonResponse({ design: result.design, issues: result.issues });
  } catch (error) {
    const failure = requestError(error);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
