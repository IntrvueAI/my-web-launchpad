import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SchoolLayout,
  SchoolLoading,
  SchoolError,
} from "@/components/schools/SchoolLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { schoolApi, schoolKeys, type ClassInvitation } from "@/lib/schools";

export default function JoinClassPage() {
  const { token = "" } = useParams();
  const { user } = useAuth();
  const uid = user?.id || "";
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const invite = useQuery({
    queryKey: [...schoolKeys.root(uid), "invitation", token],
    queryFn: () => schoolApi<ClassInvitation>("preview_invite", { token }),
    enabled: !!user,
    retry: false,
    gcTime: 0,
  });
  const join = useMutation({
    mutationFn: () =>
      schoolApi("join_class", { token, name: name.trim(), consent }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: schoolKeys.root(uid) });
      navigate("/classes", { replace: true });
    },
  });
  const c = invite.data;
  return (
    <SchoolLayout student>
      {invite.isError ? (
        <div className="mx-auto max-w-xl space-y-4">
          <SchoolError error={invite.error} />
          <p className="text-sm text-muted-foreground">
            Class links expire after 14 days and can be replaced by your
            teacher. Ask them for a new invitation if this one is no longer
            available.
          </p>
          <Button asChild variant="outline">
            <Link to="/classes">My classes</Link>
          </Button>
        </div>
      ) : !c ? (
        <SchoolLoading label="Checking your class invitation…" />
      ) : (
        <section className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 sm:p-9 space-y-5">
          <GraduationCap size={32} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">
              You’re invited to join
            </p>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold">
              {c.name}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {c.teacher_name} · {c.school_name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {c.year_group || "11+ practice"} · target: {c.weekly_target}{" "}
              interviews per week
            </p>
          </div>
          {["active", "pending"].includes(c.status || "") ? (
            <>
              <p className="rounded-xl bg-muted p-4">
                {c.status === "active"
                  ? "You have already joined this class."
                  : "Your request has been sent. Your teacher will check your name before approving it."}
              </p>
              <Button asChild>
                <Link to="/classes">Open My classes</Link>
              </Button>
            </>
          ) : ["removed", "declined"].includes(c.status || "") ? (
            <p role="status" className="rounded-xl bg-muted p-4">
              Contact your teacher before joining this class again.
            </p>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                join.mutate();
              }}
            >
              <div>
                <label
                  htmlFor="pupil-name"
                  className="block text-sm font-semibold"
                >
                  Pupil’s name
                </label>
                <Input
                  id="pupil-name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 min-h-11"
                  placeholder="The name your teacher knows you by"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use the account this pupil practises with. Each account
                  represents one pupil.
                </p>
              </div>
              <div className="rounded-xl border bg-primary/5 p-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck size={18} />
                  What your teacher will see
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                  <li>
                    New 11+ interviews started after they approve your request.
                  </li>
                  <li>
                    Practice activity, interview transcripts, scores and AI
                    feedback.
                  </li>
                  <li>
                    You can read their comments and leave the class from My
                    classes.
                  </li>
                </ul>
                <p className="mt-3 text-sm">
                  Earlier interviews and Medicine practice stay private. Other
                  pupils cannot see your results.
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                I recognise this teacher and agree to share this pupil’s new 11+
                practice with them after approval.
              </label>
              {join.error && <SchoolError error={join.error} />}
              <Button
                className="min-h-11 w-full"
                disabled={join.isPending || !consent || name.trim().length < 2}
                type="submit"
              >
                {join.isPending ? "Sending request…" : "Request to join class"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your teacher will approve the request. Existing interview
                credits apply.
              </p>
            </form>
          )}
        </section>
      )}
    </SchoolLayout>
  );
}
