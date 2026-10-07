import { EmailCodeSignIn } from "@/components/EmailCodeSignIn";
import {
  GOOGLE_SIGN_IN_AVAILABLE,
  EMAIL_SIGN_IN_AVAILABLE,
  authErrorMessage,
} from "@/lib/authErrors";
import { isMedicineSite, siteName } from "@/lib/site";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";
import {
  validateEmail,
  validatePassword,
  validateName,
  sanitizeInput,
} from "@/utils/inputValidation";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { ArrowLeft } from "lucide-react";
import { setStoredProductLine } from "@/lib/productLine";
import {
  safeAuthReturn,
  pendingAuthReturn,
  rememberAuthReturn,
} from "@/lib/authReturn";

const Auth = () => {
  const founderReturnPath = () => {
    const path = new URLSearchParams(window.location.search).get("returnTo");
    return safeAuthReturn(path) || pendingAuthReturn() || "/";
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(
    () => new URLSearchParams(window.location.search).get("reset") === "1",
  );
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const { user, signInWithGoogle } = useAuth();
  const {
    handleSignIn: authSignIn,
    handleSignUp: authSignUp,
    handleResetPassword,
  } = useSimpleAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const path = safeAuthReturn(
      new URLSearchParams(window.location.search).get("returnTo"),
    );
    if (path) rememberAuthReturn(path);
  }, []);

  // Capture "arrived via the Medicine landing page" before anything else runs, so it survives
  // both the plain email/password flow and a full-page Google OAuth round-trip (localStorage
  // persists across that redirect; the URL/query string does not need to).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "medicine") {
      setStoredProductLine("medicine");
      params.delete("mode");
      const rest = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (rest ? `?${rest}` : ""),
      );
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(showForgotPassword ? "/reset-password" : founderReturnPath());
    }
  }, [user, navigate, showForgotPassword]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Invalid email");
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "Invalid password");
      setLoading(false);
      return;
    }

    const nameValidation = validateName(fullName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || "Invalid name");
      setLoading(false);
      return;
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedName = sanitizeInput(fullName);

    const { error } = await authSignUp(sanitizedEmail, password, sanitizedName);
    if (!error) {
      setEmail("");
      setPassword("");
      setFullName("");
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Invalid email");
      setLoading(false);
      return;
    }

    // Existing passwords must not be rejected by today's sign-up policy.
    if (!password) {
      setError("Enter your password, or use an email code.");
      setLoading(false);
      return;
    }

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email);

    const { error } = await authSignIn(sanitizedEmail, password);
    if (error) setError(authErrorMessage(error));
    if (!error) {
      navigate(founderReturnPath());
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    if (showForgotPassword) rememberAuthReturn("/reset-password");

    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message || "Failed to sign in with Google");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Input validation
    const emailValidation = validateEmail(resetEmail);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Invalid email");
      setLoading(false);
      return;
    }

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(resetEmail);

    const result = await handleResetPassword(sanitizedEmail);
    setLoading(false);
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    setResetSent(true);
  };

  return (
    <MedicineTheme enabled={isMedicineSite()}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="absolute left-4 top-4 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <CardTitle className="pt-9 text-2xl font-bold">
              {siteName()}
            </CardTitle>
            <CardDescription>
              {isMedicineSite()
                ? "Sign in with your existing Intrvue account. Your saved interviews and credits are already here."
                : "Access your personalized interview practice platform"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    Forgot Password?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {EMAIL_SIGN_IN_AVAILABLE
                      ? "Enter your email address and we'll send you a link to reset your password."
                      : "Reset emails are temporarily unavailable. If your account uses Google, sign in with Google to set a new password."}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!EMAIL_SIGN_IN_AVAILABLE && GOOGLE_SIGN_IN_AVAILABLE && (
                  <Button
                    onClick={handleGoogleSignIn}
                    className="w-full min-h-[44px]"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Continue with Google"}
                  </Button>
                )}
                {resetSent ? (
                  <Alert>
                    <AlertDescription>
                      If an account exists with that email, a reset link is on
                      its way. Check your inbox and spam folder, then open the
                      latest link.
                    </AlertDescription>
                  </Alert>
                ) : (
                  EMAIL_SIGN_IN_AVAILABLE && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full min-h-[44px]"
                        disabled={loading}
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </form>
                  )
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError(null);
                    setResetEmail("");
                    setResetSent(false);
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="signin" className="space-y-4">
                  {!GOOGLE_SIGN_IN_AVAILABLE && (
                    <p className="text-sm text-muted-foreground">
                      Google sign-in is temporarily unavailable. If you already
                      have a password, you can sign in below.
                    </p>
                  )}
                  {EMAIL_SIGN_IN_AVAILABLE && <EmailCodeSignIn />}
                  {GOOGLE_SIGN_IN_AVAILABLE && (
                    <Button
                      onClick={handleGoogleSignIn}
                      variant="outline"
                      className="w-full min-h-[44px]"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {loading ? "Signing in..." : "Continue with Google"}
                    </Button>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or use a password
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        autoComplete="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setResetSent(false);
                            setResetEmail(email);
                            setShowForgotPassword(true);
                          }}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <Input
                        id="signin-password"
                        autoComplete="current-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full min-h-[44px]"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  {!EMAIL_SIGN_IN_AVAILABLE && (
                    <p className="text-sm text-muted-foreground">
                      Password reset emails are temporarily unavailable.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  {GOOGLE_SIGN_IN_AVAILABLE && (
                    <Button
                      onClick={handleGoogleSignIn}
                      variant="outline"
                      className="w-full min-h-[44px]"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {loading ? "Signing up..." : "Continue with Google"}
                    </Button>
                  )}

                  {GOOGLE_SIGN_IN_AVAILABLE && EMAIL_SIGN_IN_AVAILABLE && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                  )}

                  {!GOOGLE_SIGN_IN_AVAILABLE && (
                    <p className="text-sm text-muted-foreground">
                      Your existing interviews and credits remain saved while
                      sign-in services are being restored.
                    </p>
                  )}
                  {EMAIL_SIGN_IN_AVAILABLE ? (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full min-h-[44px]"
                        disabled={loading}
                      >
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        {GOOGLE_SIGN_IN_AVAILABLE
                          ? "You can create an account with Google above. Email sign-up is temporarily unavailable."
                          : "Account confirmation emails are temporarily unavailable. Please try again later. Existing users can use Sign In with their password."}
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </MedicineTheme>
  );
};

export default Auth;
