import { checkOrigin, connectionSchema, inspectProvider, jsonResponse, readJsonRequest, requestError } from "@/lib/providers";
import { requireBrowserCheck } from "@/lib/browser-check";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireBrowserCheck(request);
    const data = connectionSchema.parse(await readJsonRequest(request, 2048));
    const info = await inspectProvider(data, AbortSignal.any([request.signal, AbortSignal.timeout(10000)]));
    return jsonResponse(info);
  } catch (error) {
    const failure = requestError(error);
    return jsonResponse({ error: failure.error }, failure.status);
  }
}
