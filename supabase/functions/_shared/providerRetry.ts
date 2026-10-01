/** Retry temporary provider failures within a caller-owned request deadline. */
export async function fetchWithProviderRetry(
  url: string,
  init: RequestInit,
  options: {
    signal: AbortSignal;
    attempts?: number;
    attemptTimeoutMs: number;
    maxRetryDelayMs?: number;
  },
): Promise<Response> {
  const {
    signal,
    attempts = 2,
    attemptTimeoutMs,
    maxRetryDelayMs = 15_000,
  } = options;
  for (let attempt = 1; ; attempt++) {
    signal.throwIfAborted();
    let response: Response | undefined;
    let failure: unknown;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.any([
          signal,
          AbortSignal.timeout(attemptTimeoutMs),
        ]),
      });
      if (response.ok || (response.status !== 429 && response.status < 500))
        return response;
    } catch (error) {
      failure = error;
    }
    signal.throwIfAborted();
    if (attempt >= attempts) {
      if (response) return response;
      throw failure;
    }
    const requested = response?.headers.get("retry-after");
    const seconds =
      requested && /^\d+(?:\.\d+)?$/.test(requested) ? Number(requested) : NaN;
    const date = requested ? Date.parse(requested) : NaN;
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : Number.isFinite(date)
        ? Math.max(0, date - Date.now())
        : 2000 * 2 ** (attempt - 1);
    // A longer provider hold cannot be shortened safely to fit an interactive call.
    if (delay > maxRetryDelayMs && response) return response;
    await response?.body?.cancel();
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        signal.removeEventListener("abort", abort);
        abort();
      }
    });
  }
}
