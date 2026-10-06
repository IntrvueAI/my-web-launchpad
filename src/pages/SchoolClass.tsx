import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SchoolLayout,
  SchoolError,
  SchoolLoading,
  PracticeStats,
  SchoolConfirm,
} from "@/components/schools/SchoolLayout";
import { ClassForm } from "@/components/schools/SchoolForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  schoolApi,
  schoolKeys,
  schoolDate,
  classProgressCsv,
  type ClassDetail,
  type ClassStudent,
} from "@/lib/schools";
import type { Json } from "@/integrations/supabase/types";

type Action = { action: string; payload: Record<string, Json> };
export default function SchoolClassPage() {
  const { classId = "" } = useParams();
  const { user } = useAuth();
  const uid = user?.id || "";
  const cache = useQueryClient();
  const detail = useQuery({
    queryKey: schoolKeys.class(uid, classId),
    queryFn: () => schoolApi<ClassDetail>("class", { class_id: classId }),
    enabled: !!user && !!classId,
    refetchInterval: 30000,
    retry: 1,
    gcTime: 0,
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [filter, setFilter] = useState<"active" | "pending" | "inactive">(
    "active",
  );
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [localError, setLocalError] = useState<Error | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    action: Action;
  } | null>(null);
  const mutation = useMutation({
    mutationFn: ({ action, payload }: Action) =>
      schoolApi(action, { class_id: classId, ...payload }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: schoolKeys.root(uid) });
    },
  });
  const data = detail.data;
  const c = data?.class;
  const students = data?.students || [];
  const active = students.filter((s) => s.status === "active");
  const pending = students.filter((s) => s.status === "pending");
  const shown = students
    .filter(
      (s) =>
        (filter === "active"
          ? s.status === "active"
          : filter === "pending"
            ? s.status === "pending"
            : !["active", "pending"].includes(s.status)) &&
        s.display_name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "review")
        return (
          (b.stats?.unreviewed || 0) - (a.stats?.unreviewed || 0) ||
          a.display_name.localeCompare(b.display_name)
        );
      if (sort === "practice")
        return (
          (a.stats?.this_week || 0) - (b.stats?.this_week || 0) ||
          a.display_name.localeCompare(b.display_name)
        );
      return a.display_name.localeCompare(b.display_name);
    });
  const inviteOpen =
    !!c &&
    !c.archived_at &&
    c.invite_enabled &&
    new Date(c.invite_expires_at).getTime() > Date.now();
  const inviteLink = c
    ? `${window.location.origin}/join-class/${c.invite_token}`
    : "";
  async function run(action: string, payload: Record<string, Json> = {}) {
    setLocalError(null);
    setNotice("");
    await mutation.mutateAsync({ action, payload });
  }
  function decide(s: ClassStudent, decision: string) {
    if (decision === "allow_rejoin") {
      setConfirmation({
        title: `Allow ${s.display_name} to request again?`,
        description:
          "They will need to open a current invitation, confirm sharing and send a new request. No results are shared until you approve it.",
        action: {
          action: "membership",
          payload: { student_id: s.student_id, decision },
        },
      });
      return;
    }
    if (decision === "approve") {
      void run("membership", { student_id: s.student_id, decision }).catch(
        () => {},
      );
      return;
    }
    setConfirmation({
      title:
        decision === "remove"
          ? `Remove ${s.display_name}?`
          : `Decline ${s.display_name}’s request?`,
      description:
        decision === "remove"
          ? "You will no longer be able to view this pupil’s shared practice or feedback. Their own account and interviews stay intact."
          : "Check the name with the pupil first if you do not recognise it. They will not share any results with this class.",
      action: {
        action: "membership",
        payload: { student_id: s.student_id, decision },
      },
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice("Invitation link copied. Share it privately with your pupils.");
    } catch {
      setLocalError(
        new Error(
          "Copying is unavailable here. Select the invitation link below and copy it manually.",
        ),
      );
    }
  }
  async function exportCsv() {
    setExporting(true);
    setLocalError(null);
    try {
      const fresh = await detail.refetch();
      if (fresh.error || !fresh.data)
        throw fresh.error || new Error("Could not refresh the class.");
      const url = URL.createObjectURL(
        new Blob([classProgressCsv(fresh.data.students)], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "class-practice-summary.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e : new Error("The export could not be created."),
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <SchoolLayout>
      {detail.isError ? (
        <SchoolError error={detail.error} retry={() => detail.refetch()} />
      ) : !data || !c ? (
        <SchoolLoading label="Opening your class…" />
      ) : (
        <>
          <Link
            to="/schools"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            All classes
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-primary">
                {c.year_group || "11+ practice"}{" "}
                {c.archived_at ? "· Archived" : ""}
              </p>
              <h1 className="mt-2 break-words font-display text-3xl font-semibold">
                {c.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {active.length} pupil{active.length === 1 ? "" : "s"} · weekly
                target: {c.weekly_target} interview
                {c.weekly_target === 1 ? "" : "s"} each
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => detail.refetch()}
                disabled={detail.isFetching}
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={exportCsv}
                disabled={exporting || !active.length}
              >
                <Download size={16} className="mr-2" />
                {exporting ? "Preparing…" : "Export summary"}
              </Button>
              {!c.archived_at && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setEditing(true)}
                >
                  <Settings size={16} className="mr-2" />
                  Class settings
                </Button>
              )}
            </div>
          </div>
          {c.archived_at && (
            <p className="rounded-xl border bg-muted p-4 text-sm">
              Archived on {schoolDate(c.archived_at)}. This class is read-only.
              Practice completed after it was archived is not shared here.
            </p>
          )}
          {(mutation.error || localError) && (
            <SchoolError error={localError || mutation.error} />
          )}
          {notice && (
            <p
              role="status"
              className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
            >
              {notice}
            </p>
          )}
          <PracticeStats stats={data.stats} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                  <Users size={20} />
                  Your pupils
                </h2>
                <Input
                  aria-label="Search pupils"
                  placeholder="Find a pupil…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div
                className="my-5 flex flex-wrap gap-2"
                role="group"
                aria-label="Pupil status"
              >
                {(
                  [
                    ["active", `Pupils (${active.length})`],
                    ["pending", `Join requests (${pending.length})`],
                    ["inactive", "Past members"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={filter === value ? "default" : "outline"}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {filter === "active" && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="pupil-sort"
                    className="text-xs text-muted-foreground"
                  >
                    Sort pupils
                  </label>
                  <select
                    id="pupil-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="min-h-11 max-w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="name">Name A–Z</option>
                    <option value="review">Most awaiting review</option>
                    <option value="practice">Least practice this week</option>
                  </select>
                </div>
              )}
              {!shown.length ? (
                <div className="rounded-xl border border-dashed p-7 text-center">
                  <UserPlus className="mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold">
                    {search
                      ? "No matching pupils"
                      : filter === "pending"
                        ? "No pending requests"
                        : filter === "inactive"
                          ? "No past members"
                          : "Invite your first pupils"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search
                      ? "Try another name."
                      : filter === "active"
                        ? "Share the class link, then approve names in Join requests."
                        : "This list updates automatically."}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {shown.map((s) => (
                    <article
                      key={s.student_id}
                      className="py-5 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold">
                            {s.display_name}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {s.status === "active"
                              ? `Last practice: ${schoolDate(s.stats?.last_practice)}`
                              : s.status === "pending"
                                ? `Requested ${schoolDate(s.requested_at)}`
                                : s.status === "left"
                                  ? "Left the class"
                                  : s.status === "declined"
                                    ? "Request declined"
                                    : "Removed from class"}
                          </p>
                        </div>
                        {s.status === "active" ? (
                          <Link
                            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                            to={`/schools/${classId}/students/${s.student_id}`}
                          >
                            View practice
                            <ArrowRight size={16} />
                          </Link>
                        ) : s.status === "pending" && !c.archived_at ? (
                          <div className="flex gap-2">
                            <Button
                              disabled={mutation.isPending}
                              onClick={() => decide(s, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              disabled={mutation.isPending}
                              onClick={() => decide(s, "decline")}
                            >
                              Decline
                            </Button>
                          </div>
                        ) : ["removed", "declined"].includes(s.status) &&
                          !c.archived_at ? (
                          <Button
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() => decide(s, "allow_rejoin")}
                          >
                            Allow new request
                          </Button>
                        ) : null}
                      </div>
                      {s.status === "active" && s.stats && (
                        <>
                          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <strong className="text-lg tabular-nums">
                                {s.stats.this_week}
                                <span className="text-xs font-normal text-muted-foreground">
                                  /{c.weekly_target}
                                </span>
                              </strong>
                              <p className="text-xs text-muted-foreground">
                                this week
                              </p>
                            </div>
                            <div>
                              <strong className="text-lg tabular-nums">
                                {s.stats.completed}
                              </strong>
                              <p className="text-xs text-muted-foreground">
                                since joining
                              </p>
                            </div>
                            <div>
                              <strong className="text-lg tabular-nums">
                                {s.stats.unreviewed}
                              </strong>
                              <p className="text-xs text-muted-foreground">
                                to review
                              </p>
                            </div>
                          </div>
                          <div
                            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                            aria-label={`${s.stats.this_week} of ${c.weekly_target} interviews this week`}
                          >
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min(100, (s.stats.this_week / c.weekly_target) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              {s.stats.this_week >= c.weekly_target
                                ? "Weekly target reached"
                                : s.stats.this_week === 0
                                  ? "No completed interviews this week"
                                  : `${c.weekly_target - s.stats.this_week} more to reach this week’s target`}
                            </p>
                            <button
                              className="min-h-11 text-xs text-muted-foreground underline"
                              disabled={mutation.isPending}
                              onClick={() => decide(s, "remove")}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
            <aside className="space-y-4">
              <section className="rounded-2xl border bg-card p-5">
                <h2 className="font-display text-lg font-semibold">
                  Invite to this class
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Pupils sign in, confirm what they’ll share and request to
                  join. Approve only the names you recognise.
                </p>
                {inviteOpen ? (
                  <>
                    <label
                      htmlFor="class-invite"
                      className="mt-5 block text-sm font-medium"
                    >
                      Private invitation link
                    </label>
                    <Input
                      id="class-invite"
                      className="mt-2 text-xs"
                      readOnly
                      value={inviteLink}
                      onFocus={(e) => e.target.select()}
                    />
                    <Button className="mt-3 min-h-11 w-full" onClick={copy}>
                      <Copy size={16} className="mr-2" />
                      Copy invitation link
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Expires {schoolDate(c.invite_expires_at)}. Do not post it
                      publicly.
                    </p>
                  </>
                ) : (
                  <p className="mt-5 rounded-xl bg-muted p-3 text-sm">
                    {c.archived_at
                      ? "Invitations are closed for this archived class."
                      : "This invitation is closed or expired."}
                  </p>
                )}
                {!c.archived_at && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      disabled={mutation.isPending}
                      className="min-h-11 text-sm text-primary underline"
                      onClick={() =>
                        setConfirmation({
                          title: "Create a new invitation link?",
                          description:
                            "The current link will stop working. Existing members and join requests are unaffected. The new link lasts 14 days.",
                          action: {
                            action: "invite",
                            payload: { decision: "rotate" },
                          },
                        })
                      }
                    >
                      Create new link
                    </button>
                    {inviteOpen && (
                      <button
                        disabled={mutation.isPending}
                        className="min-h-11 text-sm text-muted-foreground underline"
                        onClick={() =>
                          setConfirmation({
                            title: "Close new invitations?",
                            description:
                              "The current link will stop accepting new requests. Existing pupils keep their class access.",
                            action: {
                              action: "invite",
                              payload: { decision: "close" },
                            },
                          })
                        }
                      >
                        Close invitations
                      </button>
                    )}
                  </div>
                )}
              </section>
              <section className="rounded-2xl border bg-card p-5">
                <h2 className="font-semibold">What you can see</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  11+ and school interview practice started after you approve a
                  pupil. Earlier practice and Medicine interviews remain
                  private. Leaving or removing a pupil stops your access to
                  their results.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Completed interviews are counted once, even if feedback is
                  retried. An absent score means there wasn’t a complete
                  assessment; it is not zero.
                </p>
              </section>
            </aside>
          </div>
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Class settings</DialogTitle>
              </DialogHeader>
              {editing && (
                <ClassForm
                  initial={c}
                  busy={mutation.isPending}
                  onSubmit={async (values) => {
                    await run("update_class", values);
                    setEditing(false);
                  }}
                />
              )}
              {mutation.error && <SchoolError error={mutation.error} />}
              <div className="mt-4 border-t pt-4">
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setEditing(false);
                    setConfirmation({
                      title: "Archive this class?",
                      description:
                        "This closes invitations and makes the class read-only. Existing shared results remain available, but later practice is not shared. Create a new class for a new cohort.",
                      action: {
                        action: "update_class",
                        payload: { archive: true },
                      },
                    });
                  }}
                >
                  Archive class
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <SchoolConfirm
            open={!!confirmation}
            title={confirmation?.title || ""}
            description={confirmation?.description || ""}
            onClose={() => setConfirmation(null)}
            onConfirm={() => {
              const next = confirmation?.action;
              setConfirmation(null);
              if (next) void run(next.action, next.payload).catch(() => {});
            }}
          />
        </>
      )}
    </SchoolLayout>
  );
}
