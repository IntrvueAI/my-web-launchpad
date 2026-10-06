import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SchoolLayout,
  SchoolLoading,
  SchoolError,
  SchoolConfirm,
} from "@/components/schools/SchoolLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  schoolApi,
  schoolKeys,
  schoolDate,
  schoolDateTime,
  classInviteToken,
  type SchoolState,
  type StudentMembership,
} from "@/lib/schools";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";

export default function MyClassesPage() {
  const { user } = useAuth();
  const uid = user?.id || "";
  const cache = useQueryClient();
  const navigate = useNavigate();
  const state = useQuery({
    queryKey: schoolKeys.state(uid),
    queryFn: () => schoolApi<SchoolState>("state"),
    enabled: !!user,
    retry: 1,
    gcTime: 0,
    refetchInterval: 30000,
  });
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [leaving, setLeaving] = useState<StudentMembership | null>(null);
  const leave = useMutation({
    mutationFn: (id: string) => schoolApi("leave_class", { class_id: id }),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: schoolKeys.root(uid) }),
  });
  return (
    <SchoolLayout student>
      <header>
        <p className="text-sm font-semibold text-primary">Learn together</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">My classes</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          See your practice target and your teacher’s next steps. Each pupil
          needs their own practice account.
        </p>
      </header>
      <form
        className="rounded-2xl border bg-card p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const token = classInviteToken(invite);
          if (!token) {
            setError(
              new Error(
                "Paste the full invitation link or the 32-character class code your teacher shared.",
              ),
            );
            return;
          }
          setError(null);
          navigate(`/join-class/${token}`);
        }}
      >
        <label htmlFor="class-invitation" className="font-semibold">
          Have a class invitation?
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            id="class-invitation"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Paste your teacher’s invitation link"
            maxLength={1000}
            required
            className="min-h-11"
          />
          <Button className="min-h-11" type="submit">
            View invitation
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          You can check who the teacher is before asking to join.
        </p>
      </form>
      {(error || leave.error) && <SchoolError error={error || leave.error} />}
      {state.isError ? (
        <SchoolError error={state.error} retry={() => state.refetch()} />
      ) : !state.data ? (
        <SchoolLoading />
      ) : !state.data.memberships.length ? (
        <section className="rounded-2xl border border-dashed p-8 text-center">
          <GraduationCap className="mx-auto text-primary" size={32} />
          <h2 className="mt-4 text-xl font-semibold">
            Your class will appear here
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ask your teacher for their private class link. You can keep
            practising while you wait.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Go to practice</Link>
          </Button>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {state.data.memberships.map((c) => (
            <section
              key={c.id}
              className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 space-y-4"
            >
              <div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {c.archived_at
                    ? "Archived"
                    : c.status === "active"
                      ? "Joined"
                      : c.status === "pending"
                        ? "Waiting for approval"
                        : c.status === "declined"
                          ? "Request declined"
                          : c.status === "removed"
                            ? "Removed from class"
                            : "Left class"}
                </span>
                <h2 className="mt-3 break-words font-display text-xl font-semibold">
                  {c.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.teacher_name} · {c.school_name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pupil: {c.display_name}
                </p>
              </div>
              {c.status === "active" ? (
                <>
                  <div className="rounded-xl bg-muted/60 p-4">
                    <p className="font-semibold">
                      {c.stats.this_week} of {c.weekly_target} interviews this
                      week
                    </p>
                    <div
                      role="progressbar"
                      aria-label="Weekly practice target"
                      aria-valuenow={Math.min(
                        c.stats.this_week,
                        c.weekly_target,
                      )}
                      aria-valuemin={0}
                      aria-valuemax={c.weekly_target}
                      className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"
                    >
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(100, (c.stats.this_week / c.weekly_target) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      UK week · Monday to Sunday · {c.stats.completed} completed
                      since joining
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your teacher can see 11+ interviews started after approval
                    on {schoolDate(c.approved_at)}, including the transcript and
                    AI feedback.
                    {c.archived_at
                      ? " Practice after this class was archived is not shared."
                      : ""}
                  </p>
                  <div className="border-t pt-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <MessageSquare size={18} />
                      Teacher feedback
                    </h3>
                    {!c.teacher_notes.length ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your teacher’s comments will appear here after they
                        review an interview.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {c.teacher_notes.map((n) => (
                          <article
                            key={n.session_id}
                            className="rounded-xl bg-primary/5 p-4"
                          >
                            <h4 className="text-sm font-semibold">
                              {INTERVIEW_TYPES[n.interview_type]?.name ||
                                "11+ practice"}{" "}
                              · {schoolDateTime(n.started_at)}
                            </h4>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {n.note}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {c.status === "pending"
                    ? "Your teacher needs to approve your name. Your interview results are not shared while you wait."
                    : ["removed", "declined"].includes(c.status)
                      ? "Your results are no longer shared. Contact your teacher if you would like to join again."
                      : "Your results are no longer shared with this class. You can request to rejoin with a current invitation link."}
                </p>
              )}
              {["active", "pending"].includes(c.status) && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={leave.isPending}
                  onClick={() => setLeaving(c)}
                >
                  {c.status === "pending"
                    ? "Cancel join request"
                    : "Leave class"}
                </Button>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Medicine practice and interviews from before approval stay private.
        Leaving a class stops the teacher’s access to your shared feedback. Your
        interviews and credits stay in your own account.
      </p>
      <SchoolConfirm
        open={!!leaving}
        onClose={() => setLeaving(null)}
        title={
          leaving?.status === "pending"
            ? "Cancel this join request?"
            : "Leave this class?"
        }
        description="The teacher will no longer be able to view your practice or feedback through this class. Your own account and interviews stay intact."
        onConfirm={() => {
          if (leaving) leave.mutate(leaving.id);
          setLeaving(null);
        }}
      />
    </SchoolLayout>
  );
}
