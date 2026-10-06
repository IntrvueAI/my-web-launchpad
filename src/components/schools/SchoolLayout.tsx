import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  RefreshCw,
  School,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { isMedicineSite, SCHOOL_ORIGIN } from "@/lib/site";
import { setStoredProductLine } from "@/lib/productLine";
import {
  clearAuthReturn,
  pendingAuthReturn,
  safeAuthReturn,
} from "@/lib/authReturn";
import type { SchoolStats } from "@/lib/schools";
import { schoolDate } from "@/lib/schools";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AuthReturnResume() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user || !["/", "/landing"].includes(location.pathname)) return;
    const path = pendingAuthReturn();
    if (path) {
      clearAuthReturn();
      navigate(path, { replace: true });
    }
  }, [user, location.pathname, navigate]);
  return null;
}
export function SchoolLayout({
  children,
  student = false,
  hasUnsavedChanges = false,
}: {
  children: ReactNode;
  student?: boolean;
  hasUnsavedChanges?: boolean;
}) {
  const { user, loading, signOut } = useAuth();
  const cache = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<Error | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  async function leaveAccount() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const result = await signOut();
      if (result.error) throw result.error;
      cache.removeQueries({ queryKey: ["schools"] });
      clearAuthReturn();
    } catch {
      setSignOutError(
        new Error("We could not sign you out. Please try again."),
      );
    } finally {
      setSigningOut(false);
    }
  }
  const location = useLocation();
  useEffect(() => {
    if (isMedicineSite()) return;
    setStoredProductLine("11plus");
    if (user) clearAuthReturn();
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.append(robots, referrer);
    return () => {
      robots.remove();
      referrer.remove();
    };
  }, [user]);
  if (isMedicineSite())
    return (
      <main className="mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-2xl font-bold">Classes for 11+ practice</h1>
        <p>The school dashboard is part of Intrvue’s 11+ platform.</p>
        <a
          className="text-primary underline"
          href={`${SCHOOL_ORIGIN}${location.pathname}`}
        >
          Open on Intrvue
        </a>
      </main>
    );
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/schools"
            className="flex items-center gap-3 font-display font-semibold"
          >
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <GraduationCap size={24} />
            </span>
            <span>
              Intrvue <span className="text-muted-foreground">for schools</span>
              <small className="block font-sans text-xs text-muted-foreground">
                11+ interview practice
              </small>
            </span>
          </Link>
          <nav
            aria-label="School navigation"
            className="flex flex-wrap gap-1 text-sm"
          >
            <Link
              to="/schools"
              aria-current={!student ? "page" : undefined}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-muted"
            >
              <School size={16} />
              For teachers
            </Link>
            <Link
              to="/classes"
              aria-current={student ? "page" : undefined}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-muted"
            >
              <Users size={16} />
              My classes
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-muted"
            >
              <ArrowLeft size={16} />
              Practice home
            </Link>
            {user && (
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={signingOut}
                onClick={() =>
                  hasUnsavedChanges
                    ? setConfirmSignOut(true)
                    : void leaveAccount()
                }
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
        {user && (
          <p className="break-all text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
        {signOutError && <SchoolError error={signOutError} />}
        {loading ? (
          <SchoolLoading />
        ) : !user ? (
          <section className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 sm:p-10 space-y-5">
            <p className="text-sm font-semibold text-primary">
              {student
                ? "Learn together"
                : "A clear view of every pupil’s practice"}
            </p>
            <h1 className="font-display text-3xl font-semibold">
              {student
                ? "Join your class"
                : "Bring interview practice into your classroom"}
            </h1>
            <p className="leading-relaxed text-muted-foreground">
              {student
                ? "Sign in to the account this pupil uses for practice, or create one. You’ll see the class details before choosing what to share."
                : "Create a class, invite pupils and follow their progress. Review AI feedback, see their practice activity and leave your own next steps."}
            </p>
            <Button asChild className="min-h-11">
              <Link
                to={`/auth?returnTo=${encodeURIComponent(safeAuthReturn(location.pathname + location.search) || "/schools")}`}
              >
                Sign in or create an account
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Each pupil uses their own student or parent account. Existing
              interview credits apply.
            </p>
          </section>
        ) : (
          children
        )}
      </main>
      <SchoolConfirm
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out without saving?"
        description="Your teacher feedback draft has not been saved. Cancel to keep editing, or confirm to sign out."
        onConfirm={() => {
          setConfirmSignOut(false);
          void leaveAccount();
        }}
      />
    </div>
  );
}
export function SchoolLoading({
  label = "Loading your classes…",
}: {
  label?: string;
}) {
  return (
    <p
      className="rounded-2xl border bg-card p-8 text-muted-foreground"
      role="status"
    >
      {label}
    </p>
  );
}
export function SchoolError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-card p-5"
    >
      <p>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      {retry && (
        <Button className="mt-3 min-h-11" variant="outline" onClick={retry}>
          <RefreshCw size={16} className="mr-2" />
          Try again
        </Button>
      )}
    </div>
  );
}
export function PracticeStats({ stats }: { stats: SchoolStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["This week", stats.this_week, "Completed interviews · UK week"],
        [
          "Since joining",
          stats.completed,
          `${stats.practice_days} practice day${stats.practice_days === 1 ? "" : "s"} · ${stats.minutes < 1 && stats.completed > 0 ? "under 1 min" : `about ${stats.minutes} min`}`,
        ],
        [
          "11+ average",
          stats.average_score === null ? "—" : `${stats.average_score}/20`,
          stats.scored
            ? `${stats.scored} scored 11+ interviews`
            : "No full 11+ score yet",
        ],
        [
          "To review",
          stats.unreviewed,
          `Last practice: ${schoolDate(stats.last_practice)}`,
        ],
      ].map(([label, value, sub]) => (
        <div
          key={label}
          className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5"
        >
          <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {sub}
          </p>
        </div>
      ))}
    </div>
  );
}
export function SchoolConfirm({
  title,
  description,
  open,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
