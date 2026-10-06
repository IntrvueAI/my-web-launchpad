const KEY = "intrvue:auth-return:v1";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const SCHOOL_PATH = new RegExp(
  `^/(?:schools(?:/${UUID}(?:/students/${UUID})?)?|classes|join-class/[a-f0-9]{32})$`,
);
/** Strict local destinations only. Invite links survive sign-up and Google round trips. */
export function safeAuthReturn(
  value: string | null | undefined,
): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.length > 400
  )
    return null;
  try {
    const url = new URL(value, "https://intrvue.ai");
    if (url.origin !== "https://intrvue.ai" || url.hash) return null;
    if (
      !SCHOOL_PATH.test(url.pathname) &&
      !["/admin/guest-trials", "/admin/guest-feedback"].includes(url.pathname)
    )
      return null;
    for (const [key, v] of url.searchParams) {
      if (key === "page" && /^[1-9][0-9]{0,4}$/.test(v)) continue;
      if (key === "interview" && new RegExp(`^${UUID}$`).test(v)) continue;
      return null;
    }
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
export function rememberAuthReturn(path: string) {
  const safe = safeAuthReturn(path);
  if (!safe) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ path: safe, expires: Date.now() + 24 * 60 * 60 * 1000 }),
    );
  } catch {
    /* The explicit URL still works. */
  }
}
export function pendingAuthReturn(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      !value ||
      typeof value.expires !== "number" ||
      value.expires < Date.now()
    ) {
      clearAuthReturn();
      return null;
    }
    return safeAuthReturn(value.path);
  } catch {
    return null;
  }
}
export function clearAuthReturn() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Storage may be disabled. */
  }
}
