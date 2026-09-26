import { z } from "zod";

export const providerSchema = z.enum(["openrouter", "openai", "anthropic", "gemini", "groq", "mistral", "xai", "deepseek", "together", "cohere", "cerebras"]);
export type Provider = z.infer<typeof providerSchema>;
export const providerLabels: Record<Provider, string> = {
  openrouter: "OpenRouter", openai: "OpenAI", anthropic: "Claude (Anthropic)", gemini: "Google Gemini",
  groq: "Groq", mistral: "Mistral AI", xai: "Grok (xAI)", deepseek: "DeepSeek",
  together: "Together AI", cohere: "Cohere", cerebras: "Cerebras",
};
export const providerDefaults: Record<Provider, string> = {
  openrouter: "openai/gpt-4.1-mini",
  openai: "gpt-4.1-mini", anthropic: "claude-sonnet-4-6", gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile", mistral: "mistral-large-latest", xai: "grok-4.7",
  deepseek: "deepseek-flash", together: "openai/gpt-oss-20b",
  cohere: "command-a-plus-05-2026", cerebras: "gpt-oss-120b",
};
export const limits = {
  maxTokens: { min: 512, max: 8192 },
  temperature: { min: 0, max: 1.5 },
  contextNations: { min: 3, max: 16 },
} as const;
const boundedInteger = ({ min, max }: { min: number; max: number }) => z.number().int().min(min).max(max);
export const generationFields = {
  temperature: z.number().finite().min(limits.temperature.min).max(limits.temperature.max),
  /** 0 means no application cap; the model uses its own maximum. */
  maxTokens: z.union([z.literal(0), boundedInteger(limits.maxTokens)]),
  prompt: z.string().max(1500),
};
const savedModel = z.string().max(120);
const settingsSchema = z.object({
  difficulty: z.enum(["Standard", "Challenging"]),
  turnDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  provider: providerSchema,
  model: savedModel,
  providerModels: z.record(savedModel),
  ...generationFields,
  contextNations: boundedInteger(limits.contextNations),
  contrast: z.boolean(), motion: z.boolean(), transparency: z.boolean(),
  fontSize: z.number().int().min(16).max(20), sound: z.boolean(),
  volume: z.number().finite().min(0).max(100), labels: z.boolean(),
  texture: z.boolean(), highlights: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = {
  difficulty: "Standard", turnDays: 7, provider: "openrouter", model: providerDefaults.openrouter,
  providerModels: { ...providerDefaults }, temperature: 0.7, maxTokens: 1600,
  contextNations: 8, prompt: "", contrast: false,
  motion: false, transparency: true, fontSize: 16, sound: false, volume: 30,
  labels: true, texture: true, highlights: true,
};

/** Recover individual preferences; a bad numeric value must not erase the rest. */
export function parseSettings(raw: unknown): Settings {
  const stored = raw && typeof raw === "object" && !Array.isArray(raw)
    ? { ...raw } as Record<string, unknown> : {};
  if (stored.provider === "demo" || stored.provider === "ollama") {
    stored.provider = defaults.provider;
    stored.model = defaults.model;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(settingsSchema.shape) as (keyof Settings)[]) {
    const parsed = settingsSchema.shape[key].safeParse(stored[key]);
    result[key] = parsed.success ? parsed.data : defaults[key];
  }
  const settings = result as Settings;
  const models = stored.providerModels && typeof stored.providerModels === "object"
    ? stored.providerModels as Record<string, unknown> : {};
  settings.providerModels = { ...providerDefaults };
  for (const provider of providerSchema.options) {
    const parsed = savedModel.safeParse(models[provider]);
    if (parsed.success) settings.providerModels[provider] = parsed.data;
  }
  if (!savedModel.safeParse(stored.model).success) settings.model = settings.providerModels[settings.provider];
  settings.providerModels[settings.provider] = settings.model;
  return settings;
}

export function selectProvider(settings: Settings, provider: Provider): Settings {
  return {
    ...settings, provider, model: settings.providerModels[provider],
    providerModels: { ...settings.providerModels, [settings.provider]: settings.model },
  };
}

export function normalizeNumber(value: string, fallback: number, range: { min: number; max: number }) {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number)) return fallback;
  const rounded = Math.round(number);
  if (rounded === 0) return 0;
  return Math.max(range.min, Math.min(range.max, rounded));
}

// With default reasoning enabled, these OpenAI families own their sampling.
export function supportsTemperature(provider: Provider, model: string) {
  if (provider !== "openai" && provider !== "openrouter") return true;
  const id = model.trim().replace(/^openai\//, "").replace(/^ft:/, "");
  return !/^(?:o[134](?:-|$)|gpt-[5-9](?:[.-]|$))/.test(id);
}
