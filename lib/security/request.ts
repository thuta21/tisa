export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function assertSameOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site")
    throw new RequestError("Forbidden origin", 403);
}

async function limitedBody(request: Request, limit: number) {
  const advertised = request.headers.get("content-length");
  if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > limit)) throw new RequestError("Request body is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new RequestError("Request body is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export async function readJson(request: Request, limit = 262_144): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? ""))
    throw new RequestError("Send an application/json request.", 415);
  const bytes = await limitedBody(request, limit);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestError("Request body must be valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}

export async function readUpload(request: Request, limit = 10 * 1024 * 1024 + 65_536) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new RequestError("Send a multipart file upload.", 415);
  const bytes = await limitedBody(request, limit);
  try { return await new Response(bytes, { headers: { "Content-Type": contentType } }).formData(); }
  catch { throw new RequestError("Invalid file upload."); }
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
export function requireUuid(value: unknown) { if (!isUuid(value)) throw new RequestError("A valid record ID is required."); return value; }
