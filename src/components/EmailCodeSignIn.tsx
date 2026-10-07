import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authErrorMessage } from "@/lib/authErrors";
import { validateEmail } from "@/utils/inputValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function EmailCodeSignIn() {
  const { sendSignInCode, verifySignInCode } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);

  async function send() {
    if (busy || remaining > 0) return;
    const address = (sentTo || email).trim();
    const valid = validateEmail(address);
    if (!valid.isValid) {
      setError(valid.error || "Enter your email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendSignInCode(address);
      // Keep the same response for an unknown email; never reveal account membership.
      if (result.error && result.error.code !== "signups_not_allowed")
        throw result.error;
      setSentTo(address);
      setCode("");
      setRemaining(60);
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6,10}$/.test(code.trim())) {
      setError("Enter the code from your latest email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await verifySignInCode(sentTo, code.trim());
      if (result.error) throw result.error;
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Sign in by email"
      className="space-y-3 rounded-lg border p-4"
    >
      <div>
        <h3 className="font-semibold">Sign in with an email code</h3>
        <p className="text-sm text-muted-foreground">
          Use the email on your existing account, including the address you use
          with Google.
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sentTo ? (
        <>
          <p role="status" className="text-sm break-words">
            If an account exists for {sentTo}, we’ve sent a sign-in code. Check
            your inbox and spam folder.
          </p>
          <form onSubmit={verify} className="space-y-3">
            <Label htmlFor="signin-code">Email code</Label>
            <Input
              id="signin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              required
              maxLength={10}
              autoFocus
              disabled={busy}
            />
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={busy}
            >
              {busy ? "Please wait…" : "Verify and sign in"}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={busy || remaining > 0}
              onClick={send}
            >
              {remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setSentTo("");
                setCode("");
                setError("");
              }}
            >
              Use another email
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="space-y-3"
        >
          <Label htmlFor="code-email">Account email</Label>
          <Input
            id="code-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={busy}
          />
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={busy || remaining > 0}
          >
            {busy
              ? "Sending…"
              : remaining > 0
                ? `Send again in ${remaining}s`
                : "Email me a sign-in code"}
          </Button>
        </form>
      )}
    </section>
  );
}
