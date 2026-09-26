import { z } from "zod";
import { turnSchema } from "@/lib/game";
import { generationFields, type Provider } from "@/lib/settings";
import { estimateMessageTokens, estimateTurnTokens, turnMessages } from "@/lib/generation";
import { requireBrowserCheck } from "@/lib/browser-check";
import {
  chatPayload, checkOrigin, connectionSchema, fetchProvider, jsonResponse, parseChatAnswer, providerEndpoint,
  openRouterInfo, ProviderError, providerHeaders, readJsonRequest, readProviderJson, requestError,
} from "@/lib/providers";

const input = connectionSchema.extend({
  ...generationFields,
  context: z.record(z.unknown()),
});
export async function POST(request: Request) {
  let provider: Provider | undefined;
  try {
    checkOrigin(request);
    await requireBrowserCheck(request);
    const data = input.parse(await readJsonRequest(request, 90000));
    provider = data.provider;
    const headers = providerHeaders(data);
    const estimate = estimateTurnTokens(data, data.context);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
    const messages = turnMessages(data.prompt, data.context);
    let info;
    if (provider === "openrouter") {
      info = await openRouterInfo(data, signal);
      if (!info.connected) throw new ProviderError(info.message, 400);
      if (info.contextLength && estimate > info.contextLength)
        throw new ProviderError("This context and response limit exceed the selected model's context window. Reduce them in Generation.", 400);
      if (info.maxOutputTokens && data.maxTokens > 0 && data.maxTokens > info.maxOutputTokens)
        throw new ProviderError(`This model supports at most ${info.maxOutputTokens} output tokens. Reduce the response token limit in Generation.`, 400);
    }
    const payload = chatPayload(data, messages, info);
    const response = await fetchProvider(providerEndpoint(provider), {
      method: "POST", headers, body: JSON.stringify(payload), signal,
    }, provider);
    const raw = await readProviderJson(response);
    const answer = parseChatAnswer(provider, raw);
    if (!answer) return jsonResponse({ error: "The provider returned an invalid response. Your world has not changed." }, 502);
    const content = answer.content;
    const reported = answer.tokens;
    // Missing usage is estimated so the campaign still records the turn.
    const tokens = reported ?? estimateMessageTokens(messages) + Math.max(data.maxTokens, Math.ceil((content?.length || 0) / 3));
    const failure = (error: string) => jsonResponse({ error, tokens, usageEstimated: reported === undefined }, 422);
    if (answer.finishReason === "length" || answer.finishReason === "max_tokens")
      return failure("The response token limit was reached before the turn completed. Increase it in Generation or choose a model that uses fewer reasoning tokens. Your world has not changed.");
    if (answer.refusal || answer.finishReason === "content_filter" || answer.finishReason === "refusal")
      return failure("The provider declined this decision. Rephrase it and try again. Your world has not changed.");
    if (!content?.trim()) return failure("The provider returned no turn. Increase the response limit for a reasoning model or choose another model. Your world has not changed.");
    let decoded: unknown;
    try { decoded = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); }
    catch { return failure("The model returned invalid JSON. Try again or choose a model with JSON output support. Your world has not changed."); }
    const parsed = turnSchema.safeParse(decoded);
    if (!parsed.success)
      return failure("The model returned an invalid turn. Your world has not changed. Try a model that supports JSON output.");
    return jsonResponse({ result: parsed.data, tokens, usageEstimated: reported === undefined });
  } catch (error) {
    const failure = requestError(error);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
