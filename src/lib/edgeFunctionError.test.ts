import { describe, expect, it, vi } from "vitest";
import { explainEdgeError, withSessionRefresh } from "./edgeFunctionError";
const failure = (status: number, error = "Private provider detail") => ({
  error: {
    context: new Response(JSON.stringify({ error }), { status }),
    message: "non-2xx",
  },
  data: null,
});
describe("Interview connection errors", () => {
  it("refreshes a rejected login and retries avatar authorisation once", async () => {
    const first = failure(401),
      success = { error: null, data: "token" };
    const request = vi
        .fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValue(success),
      refresh = vi.fn().mockResolvedValue({ error: null });
    expect(await withSessionRefresh(request, refresh)).toBe(success);
    expect(request).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("does not loop when the refreshed login is also rejected", async () => {
    const request = vi.fn().mockResolvedValue(failure(401)),
      refresh = vi.fn().mockResolvedValue({ error: null });
    await withSessionRefresh(request, refresh);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each(["error", "throw"])(
    "does not retry an invalid refresh (%s)",
    async (kind) => {
      const request = vi.fn().mockResolvedValue(failure(401)),
        refresh =
          kind === "error"
            ? vi.fn().mockResolvedValue({ error: new Error("expired") })
            : vi.fn().mockRejectedValue(new Error("offline"));
      await withSessionRefresh(request, refresh);
      expect(request).toHaveBeenCalledOnce();
    },
  );
  it.each([403, 429, 500])(
    "does not repeat an HTTP %s request",
    async (status) => {
      const request = vi.fn().mockResolvedValue(failure(status)),
        refresh = vi.fn();
      await withSessionRefresh(request, refresh);
      expect(request).toHaveBeenCalledOnce();
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it("explains an active interview without consuming the original response body", async () => {
    const f = failure(
      429,
      "You already have an active session. Please end it before starting another.",
    );
    const message = await explainEdgeError(f.error);
    expect(message.message).toContain("other tab");
    expect(message.status).toBe(429);
    expect((await f.error.context.json()).error).toContain("active session");
  });
  it("explains an expired interview", async () => {
    expect(
      (await explainEdgeError(failure(403, "Active session not found").error))
        .message,
    ).toContain("start it again");
  });
  it("does not expose private provider errors or HTML from a gateway", async () => {
    const json = await explainEdgeError(
      failure(500, "secret debug stack").error,
    );
    expect(json.message).not.toContain("secret");
    const html = await explainEdgeError({
      context: new Response("<h1>private proxy</h1>", { status: 502 }),
    });
    expect(html.message).toContain("temporarily unavailable");
  });
  it("explains authentication and network errors", async () => {
    expect((await explainEdgeError(failure(401).error)).message).toContain(
      "sign out",
    );
    expect(
      (await explainEdgeError(new Error("Failed to fetch"))).message,
    ).toContain("connection");
  });
});
