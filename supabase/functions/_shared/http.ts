/** Common HTTP boundary. Provider webhooks and WebSockets keep their own authentication. */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readText(
  req: Request,
  maxBytes = 262_144,
): Promise<string> {
  const advertised = Number(req.headers.get("content-length"));
  if (advertised > maxBytes) throw new HttpError(413, "Request too large");
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export function withJson(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") {
      const response = json({ error: "Method not allowed" }, 405);
      response.headers.set("Allow", "POST, OPTIONS");
      return response;
    }
    if (!/^Bearer\s+\S+$/i.test(req.headers.get("authorization") || "")) {
      return json({ error: "Unauthorized" }, 401);
    }
    try {
      let body: unknown;
      try {
        body = JSON.parse(await readText(req));
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(400, "A valid JSON object is required");
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "A valid JSON object is required");
      }
      const headers = new Headers(req.headers);
      headers.delete("content-length");
      headers.set(
        "authorization",
        `Bearer ${headers.get("authorization")!.replace(/^Bearer\s+/i, "")}`,
      );
      const response = await handler(
        new Request(req.url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }),
      );
      for (const [name, value] of Object.entries(corsHeaders))
        response.headers.set(name, value);
      response.headers.set("Content-Type", "application/json");
      return response;
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error(
        "Request handler failed",
        error instanceof Error ? error.name : "unknown",
      );
      return json({ error: "Internal server error" }, 500);
    }
  };
}

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
