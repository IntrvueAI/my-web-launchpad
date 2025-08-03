import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { validateEmail, validatePassword, validateName, sanitizeInput } from '@/utils/inputValidation';
import { sanitizeErrorMessage, authRateLimiter, secureLog } from '@/utils/secureErrorHandler';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Rate limiting check
    const identifier = email.toLowerCase();
    if (authRateLimiter.isRateLimited(identifier)) {
      const timeUntilReset = Math.ceil(authRateLimiter.getTimeUntilReset(identifier) / 60000);
      setError(`Too many attempts. Please try again in ${timeUntilReset} minutes.`);
      setLoading(false);
      return;
    }

    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      setLoading(false);
      return;
    }

    const nameValidation = validateName(fullName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid name');
      setLoading(false);
      return;
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedName = sanitizeInput(fullName);

    try {
      const { error } = await signUp(sanitizedEmail, password, sanitizedName);
      
      if (error) {
        authRateLimiter.recordAttempt(identifier);
        secureLog.warn('Sign up failed', { email: sanitizedEmail, errorType: error.message });
        setError(sanitizeErrorMessage(error));
      } else {
        secureLog.info('User signed up successfully', { email: sanitizedEmail });
        toast({
          title: "Account created successfully!",
          description: "Please check your email for verification.",
        });
      }
    } catch (error) {
      authRateLimiter.recordAttempt(identifier);
      secureLog.error('Sign up error', error, { email: sanitizedEmail });
      setError(sanitizeErrorMessage(error));
    }
    
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Rate limiting check
    const identifier = email.toLowerCase();
    if (authRateLimiter.isRateLimited(identifier)) {
      const timeUntilReset = Math.ceil(authRateLimiter.getTimeUntilReset(identifier) / 60000);
      setError(`Too many attempts. Please try again in ${timeUntilReset} minutes.`);
      setLoading(false);
      return;
    }

    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      setLoading(false);
      return;
    }

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email);

    try {
      const { error } = await signIn(sanitizedEmail, password);
      
      if (error) {
        authRateLimiter.recordAttempt(identifier);
        secureLog.warn('Sign in failed', { email: sanitizedEmail, errorType: error.message });
        setError(sanitizeErrorMessage(error));
      } else {
        secureLog.info('User signed in successfully', { email: sanitizedEmail });
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        navigate('/');
      }
    } catch (error) {
      authRateLimiter.recordAttempt(identifier);
      secureLog.error('Sign in error', error, { email: sanitizedEmail });
      setError(sanitizeErrorMessage(error));
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">11+ Interview Prep</CardTitle>
          <CardDescription>
            Access your personalized interview practice platform
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
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
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;