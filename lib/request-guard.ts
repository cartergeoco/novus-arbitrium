export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

export async function readJson(request: Request, maxBytes: number) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) {
    throw Object.assign(Error("Send JSON."), { status: 415 });
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw Object.assign(Error("Request is too large."), { status: 413 });
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(Error("Request is too large."), { status: 413 });
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw Object.assign(Error("Send JSON."), { status: 400 });
  }
}

export function errorStatus(error: unknown, fallback = 400) {
  return typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : fallback;
}
