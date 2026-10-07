import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isMedicineSite, siteName } from "@/lib/site";
import { passwordResetErrorMessage } from "@/lib/authErrors";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validatePassword } from "@/utils/inputValidation";
import { CheckCircle2, Loader2 } from "lucide-react";

type Access = "checking" | "ready" | "expired" | "unavailable";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [access, setAccess] = useState<Access>("checking");
  const [accountEmail, setAccountEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  // Never use provider error text as UI or let a failed link change another
  // already-signed-in account's password.
  const [failedLink] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    return [hash, query].some(
      (params) =>
        params.has("error") ||
        params.has("error_code") ||
        params.has("error_description"),
    );
  });

  useEffect(() => {
    if (failedLink) {
      setAccess("expired");
      return;
    }
    let active = true;
    let authVersion = 0;
    setAccess("checking");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authVersion++;
      if (!active) return;
      setAccess(session ? "ready" : "expired");
      setAccountEmail(session?.user.email ?? "");
    });
    const initialVersion = authVersion;
    // getSession waits for Supabase to exchange a recovery link's credentials.
    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!active || authVersion !== initialVersion) return;
        setAccess(error ? "unavailable" : session ? "ready" : "expired");
        setAccountEmail(session?.user.email ?? "");
      })
      .catch(() => {
        if (active && authVersion === initialVersion) setAccess("unavailable");
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [failedLink, checkAttempt]);

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    if (access !== "ready" || loading) return;
    setError(null);
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.error || "Check your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (failure) {
      setError(passwordResetErrorMessage(failure));
      if ((failure as { status?: number })?.status === 401)
        setAccess("expired");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MedicineTheme enabled={isMedicineSite()}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {success && (
              <CheckCircle2
                className="mx-auto mb-3 h-12 w-12 text-green-600"
                aria-hidden="true"
              />
            )}
            <CardTitle className="text-2xl font-bold">
              {success ? "Password updated" : `Set your ${siteName()} password`}
            </CardTitle>
            <CardDescription>
              {success ? (
                "Your new password is saved. Use it the next time you sign in."
              ) : access === "ready" ? (
                <>
                  Choose a new password for{" "}
                  <span className="break-all">
                    {accountEmail || "your account"}
                  </span>
                  .
                </>
              ) : (
                "Securely update your account password."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <Button asChild className="w-full min-h-[44px]">
                <Link to="/">Continue to my dashboard</Link>
              </Button>
            ) : access === "checking" ? (
              <p
                role="status"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking your reset link…
              </p>
            ) : access !== "ready" ? (
              <>
                <Alert variant="destructive">
                  <AlertDescription>
                    {access === "unavailable"
                      ? "We couldn't check your reset link. Check your connection and try again."
                      : "This reset link is invalid, expired or has already been used. Request a new link, or sign in to change your password."}
                  </AlertDescription>
                </Alert>
                {access === "unavailable" && (
                  <Button
                    className="w-full"
                    onClick={() => setCheckAttempt((value) => value + 1)}
                  >
                    Try again
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="w-full min-h-[44px]"
                >
                  <Link to="/auth?reset=1">Request a new reset link</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby="password-requirements"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    disabled={loading}
                  />
                  <p
                    id="password-requirements"
                    className="text-xs text-muted-foreground"
                  >
                    Use at least 8 characters, including an uppercase letter, a
                    lowercase letter and a number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full min-h-[44px]"
                  disabled={loading}
                >
                  {loading ? "Saving password…" : "Save new password"}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/">Back to my account</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MedicineTheme>
  );
}
