import { z } from "zod";
import { turnSchema } from "@/lib/game";
import { turnOutputSchema } from "@/lib/turn-output-schema";
import { generationFields, supportsTemperature, type Provider } from "@/lib/settings";
import { estimateMessageTokens, estimateTurnTokens, turnMessages } from "@/lib/generation";
import {
  checkOrigin, connectionSchema, fetchProvider, jsonResponse, providerEndpoint,
  ollamaContextLength, openRouterInfo, ProviderError, providerHeaders, requestError,
} from "@/lib/providers";

const input = connectionSchema.extend({
  ...generationFields,
  context: z.record(z.unknown()),
});
const count = z.number().int().nonnegative().safe();
const answerSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.string().nullish(),
    message: z.object({ content: z.string().nullish(), refusal: z.string().nullish() }).optional(),
  })).optional(),
  message: z.object({ content: z.string().nullish() }).optional(),
  done_reason: z.string().optional(),
  usage: z.object({ total_tokens: count.optional(), prompt_tokens: count.optional(), completion_tokens: count.optional() }).optional(),
  prompt_eval_count: count.optional(), eval_count: count.optional(),
});

export async function POST(request: Request) {
  let provider: Provider | undefined;
  try {
    checkOrigin(request);
    const text = await request.text();
    if (text.length > 90000) return jsonResponse({ error: "Turn context is too large. Reduce nations in context or scenario instructions in Generation." }, 413);
    const data = input.parse(JSON.parse(text));
    provider = data.provider;
    const headers = providerHeaders(data);
    const estimate = estimateTurnTokens(data, data.context);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(provider === "ollama" ? 180000 : 60000)]);
    const messages = turnMessages(data.prompt, data.context);
    const payload: Record<string, unknown> = { model: data.model, messages };
    if (provider === "ollama") {
      const contextLength = await ollamaContextLength(data, signal);
      if (contextLength && estimate > contextLength)
        throw new ProviderError("This context and response limit exceed the Ollama model's context window. Reduce them in Generation or choose a larger-context model.", 400);
      payload.stream = false;
      payload.format = turnOutputSchema(data.context);
      // Ollama's default context can silently discard the scenario and older events.
      payload.options = {
        temperature: data.temperature, num_predict: data.maxTokens,
        num_ctx: Math.min(contextLength ?? Infinity, Math.max(4096, Math.ceil(estimate / 1024) * 1024)),
      };
    } else if (provider === "openrouter") {
      const info = await openRouterInfo(data, signal);
      if (!info.connected) throw new ProviderError(info.message, 400);
      if (info.contextLength && estimate > info.contextLength)
        throw new ProviderError("This context and response limit exceed the selected model's context window. Reduce them in Generation.", 400);
      if (info.maxOutputTokens && data.maxTokens > info.maxOutputTokens)
        throw new ProviderError(`This model supports at most ${info.maxOutputTokens} output tokens. Reduce the response token limit in Generation.`, 400);
      payload.max_tokens = data.maxTokens;
      if (info.temperature) payload.temperature = data.temperature;
      if (info.jsonOutput) payload.response_format = { type: "json_object" };
    } else {
      payload.max_completion_tokens = data.maxTokens;
      payload.response_format = { type: "json_object" };
      if (supportsTemperature(provider, data.model)) payload.temperature = data.temperature;
    }
    const response = await fetchProvider(providerEndpoint(provider), {
      method: "POST", headers, body: JSON.stringify(payload), signal,
    }, provider);
    const raw = await response.json();
    const answer = answerSchema.safeParse(raw);
    if (!answer.success) return jsonResponse({ error: "The provider returned an invalid response. Your world has not changed." }, 502);
    const result = answer.data;
    const choice = result.choices?.[0];
    const content = provider === "ollama" ? result.message?.content : choice?.message?.content;
    const reported = provider === "ollama"
      ? result.prompt_eval_count !== undefined && result.eval_count !== undefined ? result.prompt_eval_count + result.eval_count : undefined
      : result.usage?.total_tokens ?? (result.usage?.prompt_tokens !== undefined && result.usage?.completion_tokens !== undefined
        ? result.usage.prompt_tokens + result.usage.completion_tokens : undefined);
    // Missing usage is estimated so the campaign still records the turn.
    const tokens = reported ?? estimateMessageTokens(messages) + Math.max(data.maxTokens, Math.ceil((content?.length || 0) / 3));
    const failure = (error: string) => jsonResponse({ error, tokens, usageEstimated: reported === undefined }, 422);
    if (choice?.finish_reason === "length" || result.done_reason === "length")
      return failure("The response token limit was reached before the turn completed. Increase it in Generation or choose a model that uses fewer reasoning tokens. Your world has not changed.");
    if (choice?.message?.refusal || choice?.finish_reason === "content_filter")
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
    const failure = requestError(error, provider);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
