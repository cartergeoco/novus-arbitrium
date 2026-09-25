import { browserCheckCookieOptions, browserCheckResponse, browserCheckState, verifyBrowserToken } from "@/lib/browser-check";
import { errorStatus, privateJson, readJson, sameOrigin } from "@/lib/request-guard";

export async function GET(request: Request) {
  try { return privateJson(await browserCheckState(request)); }
  catch (error) { return browserCheckResponse(error); }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return privateJson({ error: "Cross-site requests are not allowed." }, 403);
    const body = await readJson(request, 4096) as { token?: unknown };
    const verified = await verifyBrowserToken(request, typeof body.token === "string" ? body.token : "");
    if (!verified.verified) return privateJson({ error: "Browser verification failed. Please try again." }, 403);
    const response = privateJson({ verified: true });
    if (verified.cookie) response.cookies.set(browserCheckCookieOptions.name, verified.cookie, browserCheckCookieOptions);
    return response;
  } catch (error) {
    const status = errorStatus(error, 0);
    if (status && status !== 503) return privateJson({ error: error instanceof Error ? error.message : "Invalid request." }, status);
    return browserCheckResponse(error);
  }
}
