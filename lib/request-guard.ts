import { NextResponse } from "next/server";

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
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(Error("Send JSON."), { status: 400 });
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Object.assign(Error("Request is too large."), { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw Object.assign(Error("Send JSON."), { status: 400 });
  }
}

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorStatus(error: unknown, fallback = 400) {
  return typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : fallback;
}
