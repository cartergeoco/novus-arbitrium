import { authorizeProvider, checkOrigin, connectionSchema, inspectProvider, jsonResponse, readJsonRequest, requestError } from "@/lib/providers";
import type { Provider } from "@/lib/settings";

export async function POST(request: Request) {
  let provider: Provider | undefined;
  try {
    checkOrigin(request);
    const data = connectionSchema.parse(await readJsonRequest(request, 2048));
    provider = data.provider;
    await authorizeProvider(data);
    const info = await inspectProvider(data, AbortSignal.any([request.signal, AbortSignal.timeout(10000)]));
    return jsonResponse(info);
  } catch (error) {
    const failure = requestError(error, provider);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
