import { checkOrigin, connectionSchema, inspectProvider, jsonResponse, requestError } from "@/lib/providers";
import type { Provider } from "@/lib/settings";

export async function POST(request: Request) {
  let provider: Provider | undefined;
  try {
    checkOrigin(request);
    const text = await request.text();
    if (text.length > 2048) return jsonResponse({ error: "Provider settings are too large." }, 413);
    const data = connectionSchema.parse(JSON.parse(text));
    provider = data.provider;
    const info = await inspectProvider(data, AbortSignal.any([request.signal, AbortSignal.timeout(10000)]));
    return jsonResponse(info);
  } catch (error) {
    const failure = requestError(error, provider);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
