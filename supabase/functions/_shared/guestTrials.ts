import { HttpError, isUuid } from "./http.ts";

export type GuestUser = { id: string; app_metadata?: Record<string, unknown> };
export const isGuestUser = (user: GuestUser) =>
  typeof user.app_metadata?.mmi_guest_trial === "string";

export async function authorizeGuestInterview(
  service: { rpc: CallableFunction },
  user: GuestUser,
  sessionId: string | null | undefined,
  kind: "token" | "brain" | "feedback",
): Promise<boolean> {
  if (!isGuestUser(user)) return false;
  if (!isUuid(sessionId))
    throw new HttpError(403, "An active guest interview is required");
  const { data, error } = await service.rpc("authorize_mmi_guest_run", {
    p_user_id: user.id,
    p_session_id: sessionId,
    p_kind: kind,
  });
  if (error || !data || data.trial_id !== user.app_metadata!.mmi_guest_trial) {
    // Only expose the deliberately authored policy messages, never database diagnostics.
    const messages = [
      "Your guest trial has expired",
      "This trial invitation has been closed",
      "You have used the interviews included in this trial",
      "This interview has reached its connection retry limit",
      "This interview has reached its conversation limit",
      "This interview has reached its feedback retry limit",
      "Please finish your trial feedback",
    ];
    throw new HttpError(
      403,
      messages.includes(error?.message)
        ? error.message
        : "This guest interview is not available",
    );
  }
  return true;
}

const encoder = new TextEncoder();
export const isShortGuestCode = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Za-z0-9_-]{22}$/.test(code);
export function newGuestLinkCode(): string {
  // 128 random bits keep a readable path unguessable. It is a bearer invitation.
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function guestReviewInput(body: Record<string, unknown>) {
  if (
    !Number.isInteger(body.rating) ||
    Number(body.rating) < 1 ||
    Number(body.rating) > 5 ||
    !["smooth", "some-issues", "could-not-complete"].includes(
      String(body.experience),
    ) ||
    typeof body.improvement !== "string" ||
    body.improvement.trim().length < 5 ||
    body.improvement.trim().length > 1500
  )
    throw new HttpError(400, "Please complete the short feedback form");
  return {
    rating: Number(body.rating),
    experience: String(body.experience),
    improvement: body.improvement.trim(),
  };
}
async function signingKey() {
  const secret = Deno.env.get("MMI_GUEST_LINK_SECRET");
  if (!secret || secret.length < 32)
    throw new HttpError(503, "Guest invitations are not configured yet");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function guestInviteCode(inviteId: string) {
  if (!isUuid(inviteId)) throw new HttpError(400, "Invalid invitation");
  return `${inviteId}.${hex(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(`invite:v1:${inviteId}`)))}`;
}
export async function verifyGuestInvite(code: unknown): Promise<string> {
  if (typeof code !== "string" || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(code))
    throw new HttpError(403, "This invitation link is not valid");
  const [id, signature] = code.split(".");
  if (
    !isUuid(id) ||
    !(await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      Uint8Array.from(signature.match(/../g)!, (v) => parseInt(v, 16)),
      encoder.encode(`invite:v1:${id}`),
    ))
  ) {
    throw new HttpError(403, "This invitation link is not valid");
  }
  return id;
}
export async function guestPassword(trialId: string, nonce: string) {
  // Deterministic retry credentials stay on the server. They are never returned to the browser.
  return hex(
    await crypto.subtle.sign(
      "HMAC",
      await signingKey(),
      encoder.encode(`password:v1:${trialId}:${nonce}`),
    ),
  );
}
export function guestDisplayName(value: unknown): string {
  if (typeof value !== "string")
    throw new HttpError(400, "Please enter your name");
  const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (
    name.length < 2 ||
    name.length > 80 ||
    !/^[\p{L}\p{M}\p{N} .'’\-]+$/u.test(name)
  )
    throw new HttpError(400, "Use 2–80 characters for your name");
  return name;
}
