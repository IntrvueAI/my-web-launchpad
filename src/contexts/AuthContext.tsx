import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  clearLocalAuthSession,
  ACCOUNT_AUTH_STORAGE_KEY,
} from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { signOutWithRecovery } from "@/lib/authSession";
import { clearAuthReturn } from "@/lib/authReturn";
import { isGuestDocument } from "@/lib/site";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  showPostSignupForm: boolean;
  setShowPostSignupForm: (show: boolean) => void;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  sendSignInCode: (email: string) => Promise<{ error: any }>;
  verifySignInCode: (email: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPostSignupForm, setShowPostSignupForm] = useState(false);
  const cache = useQueryClient();
  const signingOut = useRef(false);
  const signOutRequest = useRef<Promise<{ error: any }> | null>(null);

  useEffect(() => {
    let active = true;
    let authVersion = 0;
    // Set up auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authVersion++;
      if (!active || (signingOut.current && session)) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setShowPostSignupForm(false);
        clearAuthReturn();
        // Older settings emails returned to /auth, where a newly recovered
        // session was immediately redirected away from the password form.
        if (window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
        }
      }
      if (event === "SIGNED_OUT") {
        setShowPostSignupForm(false);
        cache.clear();
      }

      // Show post-signup form for new signups
      if (event === "SIGNED_IN" && session?.user) {
        const isNewUser =
          new Date(session.user.created_at).getTime() > Date.now() - 10000; // Within 10 seconds
        if (isNewUser && !session.user.app_metadata?.mmi_guest_trial) {
          setShowPostSignupForm(true);
        }
      }

      setLoading(false);
    });

    // Then check for existing session
    const initialVersion = authVersion;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active || signingOut.current || authVersion !== initialVersion)
          return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active && !signingOut.current && authVersion === initialVersion)
          setLoading(false);
      });

    // The SDK broadcasts successful logout. Failed server requests need the same
    // protection in other open account tabs when fallback removes stored credentials.
    const onStorage = (event: StorageEvent) => {
      if (
        isGuestDocument() ||
        event.storageArea !== localStorage ||
        event.key !== ACCOUNT_AUTH_STORAGE_KEY ||
        event.newValue !== null
      )
        return;
      signingOut.current = true;
      setUser(null);
      setSession(null);
      setShowPostSignupForm(false);
      cache.clear();
      void supabase.auth.stopAutoRefresh().catch(() => {});
      clearLocalAuthSession();
      window.location.replace("/auth");
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [cache]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    signingOut.current = false;
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    signingOut.current = false;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const sendSignInCode = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const verifySignInCode = async (email: string, token: string) => {
    signingOut.current = false;
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    signingOut.current = false;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch {
      return {
        error: new Error(
          "Google sign-in could not start. Please check your connection and try again.",
        ),
      };
    }
  };

  const signOut = () => {
    if (signOutRequest.current) return signOutRequest.current;
    signingOut.current = true;
    const request = signOutWithRecovery({
      remote: () => supabase.auth.signOut(),
      clearStoredSession: () => {
        void supabase.auth.stopAutoRefresh().catch(() => {});
        clearLocalAuthSession();
      },
      onSignedOut: () => {
        setUser(null);
        setSession(null);
        setShowPostSignupForm(false);
        setLoading(false);
        cache.clear();
        clearAuthReturn();
        try {
          sessionStorage.removeItem("intrvue:pending-medicine-practice");
        } catch {
          /* optional */
        }
      },
      reload: () => window.location.replace("/auth"),
    })
      .catch(() => ({
        error: new Error(
          "Could not clear this browser’s login. Please try again.",
        ),
      }))
      .finally(() => {
        signOutRequest.current = null;
      });
    signOutRequest.current = request;
    return request;
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    showPostSignupForm,
    setShowPostSignupForm,
    signUp,
    signIn,
    signInWithGoogle,
    sendSignInCode,
    verifySignInCode,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
