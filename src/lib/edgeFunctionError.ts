export function edgeErrorResponse(error: unknown): Response | null {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = error.context;
  return context &&
    typeof context === "object" &&
    "status" in context &&
    "clone" in context
    ? (context as Response)
    : null;
}

/** Translate only recognised server errors; never display a raw provider response or stack. */
export async function explainEdgeError(
  error: unknown,
): Promise<{ message: string; status?: number }> {
  const response = edgeErrorResponse(error);
  const status = response?.status;
  let detail: unknown;
  try {
    detail = (await response?.clone().json())?.error;
  } catch {
    /* Non-JSON gateway failures. */
  }
  if (status === 401)
    return {
      status,
      message:
        "Your sign-in has expired. Please sign out, sign in again and retry.",
    };
  if (
    detail ===
    "You already have an active session. Please end it before starting another."
  )
    return {
      status,
      message:
        "Another interview is still active. End it in the other tab before starting this interview.",
    };
  if (detail === "Active session not found")
    return {
      status,
      message:
        "This interview session is no longer active. Return to your dashboard and start it again.",
    };
  if (status === 403)
    return {
      status,
      message:
        "This account or trial cannot access this action. Return to your dashboard and check your access.",
    };
  if (status === 429)
    return {
      status,
      message:
        "The service is busy or your session limit has been reached. Please wait a moment before retrying.",
    };
  if (status && status >= 500)
    return {
      status,
      message:
        "The service is temporarily unavailable. Please try again in a moment.",
    };
  if (status)
    return {
      status,
      message:
        "The service could not complete this request. Return to your dashboard and try again.",
    };
  return {
    message:
      "Could not reach the service. Check your connection and try again.",
  };
}

/** Safe for avatar authorisation: a 401 rejects the request before an avatar is created. */
export async function withSessionRefresh<T extends { error: unknown }>(
  request: () => Promise<T>,
  refresh: () => Promise<{ error: unknown }>,
): Promise<T> {
  const first = await request();
  if (edgeErrorResponse(first.error)?.status !== 401) return first;
  try {
    const session = await refresh();
    if (!session.error) return await request();
  } catch {
    /* Keep the original authentication error, with its retry guidance. */
  }
  return first;
}
