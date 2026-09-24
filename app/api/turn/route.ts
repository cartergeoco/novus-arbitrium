import { z } from "zod";
import { turnSchema } from "@/lib/game";
const input = z.object({
  provider: z.enum(["openai", "openrouter", "ollama"]),
  key: z.string().max(512).optional(),
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(512).max(8192),
  prompt: z.string().max(1500),
  context: z.record(z.unknown()),
});
const instructions = `You are the world simulation engine for Novus Arbitrium, an alternate-history strategy game. Simulate plausible consequences and international reactions to the player's decision. Events are fiction. Use only the supplied nation IDs. Never decide the player nation's identity or flag. Missing province demographics are unknown; do not present guesses as facts. Keep outcomes proportional to elapsed days and difficulty. Geometry is intentionally excluded to save tokens. Use territory operations sparingly for justified wars, treaties or rebellions; rings are coarse longitude/latitude polygons clipped to the source nation by the game engine. Return ONLY a JSON object with this shape:
{"title":"Short outcome","summary":"Consequences and tradeoffs","category":"Domestic|Diplomacy|Economy|Military|World","effects":[{"id":"nation id","stability":0,"economy":0,"influence":0,"relations":0}],"headlines":[{"title":"Regional reaction","body":"Details"}],"territories":[]}
Each effect stat delta must be between -20 and 20 (relations -30 to 30). Max 12 effects, 4 headlines. Optional non-player effect fields: name, ideology, flag. Flag shape: {"layout":"horizontal|vertical|cross|diagonal|canton","colors":["#112233","#ddeeff","#445566"],"emblem":"none|star|sun|diamond|wreath"}. No image URLs, SVG markup, code or external resources. An optional territory entry is {"source":"id","target":"existing id, omit for a new nation","name":"new nation name","ring":[[longitude,latitude],...],"flag":{...}}; ring must be closed, have 4–100 points, no self-intersections and overlap the source. Max 3 operations. Most turns should have no territorial or identity changes.`;
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return Response.json({ error: "Origin not allowed." }, { status: 403 });
    const text = await request.text();
    if (text.length > 90000)
      return Response.json(
        { error: "Turn context is too large." },
        { status: 413 },
      );
    const data = input.parse(JSON.parse(text));
    if (data.provider !== "ollama" && (data.key?.length ?? 0) < 8)
      return Response.json({ error: "Add an API key in Settings → API first." }, { status: 400 });
    const endpoint =
      data.provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : data.provider === "ollama"
          ? "http://127.0.0.1:11434/api/chat"
          : "https://openrouter.ai/api/v1/chat/completions";
    const payload: Record<string, unknown> = {
      model: data.model,
      messages: [
        {
          role: "system",
          content:
            instructions +
            (data.prompt ? "\nScenario preferences: " + data.prompt : ""),
        },
        { role: "user", content: JSON.stringify(data.context) },
      ],
      response_format: { type: "json_object" },
    };
    if (data.provider === "openai") {
      payload.max_completion_tokens = data.maxTokens;
      if (!/^(gpt-5|gpt-6|o[134])/.test(data.model))
        payload.temperature = data.temperature;
    } else if (data.provider === "ollama") {
      payload.stream = false;
      payload.format = "json";
      payload.options = { temperature: data.temperature, num_predict: data.maxTokens };
      delete payload.response_format;
      delete payload.max_tokens;
    } else {
      payload.max_tokens = data.maxTokens;
      payload.temperature = data.temperature;
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.provider !== "ollama" && data.key) headers.Authorization = `Bearer ${data.key}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      const message =
        response.status === 401
          ? "The provider rejected this API key."
          : response.status === 429
            ? "The provider rate limit or credit limit was reached."
            : `The provider returned ${response.status}. Check the model and JSON-output support.`;
      return Response.json({ error: message }, { status: 502 });
    }
    const answer = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      message?: { content?: string };
      usage?: { total_tokens?: number };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const content = data.provider === "ollama" ? answer.message?.content : answer.choices?.[0]?.message?.content;
    if (!content) throw Error("The provider returned no usable response.");
    const parsed = turnSchema.safeParse(
      JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")),
    );
    if (!parsed.success)
      return Response.json(
        {
          error:
            "The model returned an invalid turn. The world has not changed. Try a model that supports JSON output.",
          tokens: answer.usage?.total_tokens || (answer.prompt_eval_count || 0) + (answer.eval_count || 0),
        },
        { status: 422 },
      );
    return Response.json(
      { result: parsed.data, tokens: answer.usage?.total_tokens || (answer.prompt_eval_count || 0) + (answer.eval_count || 0) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid request settings."
            : error instanceof Error && error.name === "TimeoutError"
              ? "The provider timed out. Your world has not changed."
              : "The turn could not be resolved. Your world has not changed.",
      },
      { status: 400 },
    );
  }
}
