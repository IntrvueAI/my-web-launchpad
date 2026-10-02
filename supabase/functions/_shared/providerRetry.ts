/** The provider sometimes supplies its wait only in a 429 JSON error, without Retry-After. */
export async function providerRetryDelay(
  response?: Response,
): Promise<number | undefined> {
  const requested = response?.headers.get("retry-after");
  if (requested) {
    if (/^\d+(?:\.\d+)?$/.test(requested)) return Number(requested) * 1000;
    const date = Date.parse(requested);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  if (response?.status === 429) {
    try {
      const data = await response.clone().json();
      if (
        ["insufficient_quota", "billing_hard_limit_reached"].includes(
          data?.error?.code,
        )
      )
        return Infinity;
      const match =
        typeof data?.error?.message === "string" &&
        data.error.message.match(/try again in\s+(\d+(?:\.\d+)?)\s*(ms|s)\b/i);
      if (match)
        return (
          Number(match[1]) * (match[2].toLowerCase() === "ms" ? 1 : 1000) + 250
        );
    } catch {
      /* Missing JSON uses bounded exponential backoff below. */
    }
  }
  return undefined;
}

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
    const delay =
      (await providerRetryDelay(response)) ?? 2000 * 2 ** (attempt - 1);
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
