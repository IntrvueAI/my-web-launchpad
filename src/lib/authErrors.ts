/** Only display known authentication errors, never provider internals. */
export function authErrorMessage(error: unknown): string {
  const failure = error as { code?: string; status?: number } | null;
  if (failure?.code === "unexpected_failure" && failure?.status === 500)
    return "Email delivery is temporarily unavailable. If you already have a password, use it to sign in below. Otherwise, please try again later.";
  if (failure?.status === 429 || failure?.code?.startsWith("over_"))
    return "Too many attempts. Please wait a minute before trying again.";
  if (failure?.code === "otp_expired")
    return "That code is incorrect or has expired. Use the latest email, or request a new code.";
  if (failure?.code === "invalid_credentials")
    return "The email or password is incorrect. Check your details and try again.";
  if (failure?.code === "email_not_confirmed")
    return "Please verify your email before signing in.";
  return "We could not complete sign-in. Check your connection and try again.";
}

// Replacement credentials are installed in Supabase and Google accepts the
// callback. Keep an explicit off switch for a future provider outage.
export const GOOGLE_SIGN_IN_AVAILABLE =
  import.meta.env.VITE_GOOGLE_SIGN_IN_ENABLED !== "false";

// Email delivery remains blocked by the sender domain's DNS verification.
// Turn on only after a real Supabase authentication email is accepted.
export const EMAIL_SIGN_IN_AVAILABLE =
  import.meta.env.VITE_EMAIL_SIGN_IN_ENABLED === "true";

export function passwordResetErrorMessage(error: unknown): string {
  const failure = error as { code?: string; status?: number } | null;
  if (failure?.code === "same_password")
    return "Choose a password you haven't used for this account before.";
  if (failure?.code === "weak_password")
    return "Choose a stronger password with at least 8 characters, an uppercase letter, a lowercase letter and a number.";
  if (failure?.status === 401 || failure?.code === "session_not_found")
    return "Your session has expired. Open a new reset link or sign in again.";
  if (
    failure?.code === "reauthentication_needed" ||
    failure?.code === "reauthentication_not_valid"
  )
    return "Please sign out and sign in again before changing your password.";
  if (failure?.status === 429)
    return "Too many attempts. Wait a minute before trying again.";
  return "Your password could not be saved. Check your connection and try again.";
}
