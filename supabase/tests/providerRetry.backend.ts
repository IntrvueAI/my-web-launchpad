import { describe, expect, it, vi } from "vitest";
import {
  fetchWithProviderRetry,
  providerRetryDelay,
} from "../functions/_shared/providerRetry";
import { state } from "./fixtures/state";

const options = () => ({
  signal: new AbortController().signal,
  attemptTimeoutMs: 20_000,
});
const call = (opts = options()) =>
  fetchWithProviderRetry(
    "https://provider.example.test",
    { method: "POST", body: "same request" },
    opts,
  );

describe("Temporary provider failures", () => {
  it.each([
    ["5.99s", 6240],
    ["125ms", 375],
  ])(
    "uses a provider token-limit wait of %s when Retry-After is absent",
    async (duration, delay) => {
      const response = new Response(
        JSON.stringify({
          error: {
            message: `Rate limit reached. Please try again in ${duration}.`,
          },
        }),
        { status: 429 },
      );
      expect(await providerRetryDelay(response)).toBe(delay);
      expect((await response.json()).error.message).toContain("Rate limit");
    },
  );
  it("does not retry exhausted billing quota", async () => {
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), {
        status: 429,
      }),
    );
    expect((await call()).status).toBe(429);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
  it("waits for Retry-After and resends the same request", async () => {
    vi.useFakeTimers();
    state.fetch
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "retry-after": "3" } }),
      )
      .mockResolvedValueOnce(new Response("recovered"));
    const result = call();
    await vi.advanceTimersByTimeAsync(2999);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await (await result).text()).toBe("recovered");
    expect(state.fetch.mock.calls.map(([, init]) => init.body)).toEqual([
      "same request",
      "same request",
    ]);
  });
  it("accepts HTTP-date retry holds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    state.fetch
      .mockResolvedValueOnce(
        new Response("", {
          status: 503,
          headers: { "retry-after": "Thu, 01 Oct 2026 12:00:04 GMT" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok"));
    const result = call();
    await vi.advanceTimersByTimeAsync(3999);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).status).toBe(200);
  });
  it.each([400, 401, 403])(
    "does not retry a permanent %s failure",
    async (status) => {
      state.fetch.mockResolvedValue(new Response("", { status }));
      expect((await call()).status).toBe(status);
      expect(state.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("does not shorten a long provider hold and hammer the service", async () => {
    state.fetch.mockResolvedValue(
      new Response("", { status: 429, headers: { "retry-after": "60" } }),
    );
    expect((await call()).status).toBe(429);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
  it("stops a pending retry when the request deadline ends", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    state.fetch.mockResolvedValue(new Response("", { status: 429 }));
    const result = call({ ...options(), signal: controller.signal });
    const assertion = expect(result).rejects.toThrow("deadline");
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort(new Error("deadline"));
    await assertion;
    await vi.advanceTimersByTimeAsync(5000);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
  it("retries network errors but respects the attempt limit", async () => {
    vi.useFakeTimers();
    state.fetch.mockRejectedValue(new Error("network"));
    const assertion = expect(call()).rejects.toThrow("network");
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
    expect(state.fetch).toHaveBeenCalledTimes(2);
  });
});
