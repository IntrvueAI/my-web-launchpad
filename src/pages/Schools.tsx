import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Plus,
  Users,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SchoolLayout,
  SchoolError,
  SchoolLoading,
} from "@/components/schools/SchoolLayout";
import { ClassForm } from "@/components/schools/SchoolForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  schoolApi,
  schoolKeys,
  type SchoolState,
  type ClassSettings,
} from "@/lib/schools";

export default function Schools() {
  const { user } = useAuth();
  const uid = user?.id || "";
  const cache = useQueryClient();
  const navigate = useNavigate();
  const state = useQuery({
    queryKey: schoolKeys.state(uid),
    queryFn: () => schoolApi<SchoolState>("state"),
    enabled: !!user,
    refetchInterval: 30000,
    gcTime: 0,
    retry: 1,
  });
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [school, setSchool] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [archived, setArchived] = useState(false);
  const setup = useMutation({
    mutationFn: () =>
      schoolApi("setup_teacher", {
        name: name.trim(),
        school: school.trim(),
        confirmed_teacher: confirmed,
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: schoolKeys.root(uid) });
      setEditingProfile(false);
    },
  });
  const create = useMutation({
    mutationFn: (data: {
      name: string;
      year_group: string;
      weekly_target: number;
    }) => schoolApi<ClassSettings>("create_class", data),
    onSuccess: (data) => {
      void cache.invalidateQueries({ queryKey: schoolKeys.root(uid) });
      navigate(`/schools/${data.id}`);
    },
  });
  const data = state.data;
  const classes =
    data?.classes.filter((c) =>
      archived ? !!c.archived_at : !c.archived_at,
    ) || [];
  return (
    <SchoolLayout>
      {state.isError ? (
        <SchoolError error={state.error} retry={() => state.refetch()} />
      ) : !data ? (
        <SchoolLoading />
      ) : !data.teacher || editingProfile ? (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <section className="space-y-6">
            <p className="text-sm font-semibold text-primary">
              Your teacher workspace
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight">
              Help every pupil take
              <br className="hidden sm:block" /> their next step.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Bring 11+ interview practice together in one private classroom.
            </p>
            <div className="space-y-5">
              {[
                [
                  Users,
                  "Invite your pupils",
                  "Share a private class link and approve the pupils you recognise.",
                ],
                [
                  GraduationCap,
                  "See their practice",
                  "Track completed interviews, weekly targets and recent activity.",
                ],
                [
                  ClipboardCheck,
                  "Make feedback useful",
                  "Read each assessment and transcript, then add your own next step.",
                ],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof Users;
                return (
                  <div key={String(title)} className="flex gap-4">
                    <I className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h2 className="font-semibold">{String(title)}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {String(body)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">
              {editingProfile
                ? "Edit your teacher profile"
                : "Set up your teacher profile"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pupils see these details before they join.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setup.mutate();
              }}
            >
              <fieldset disabled={setup.isPending} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-name">Your teacher name</Label>
                  <Input
                    id="teacher-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ms Patel"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-school">
                    School or tuition organisation
                  </Label>
                  <Input
                    id="teacher-school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </div>
                <label className="flex items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed">
                  <input
                    className="mt-1 h-4 w-4 shrink-0"
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    required
                  />
                  I am a teacher or tutor responsible for the pupils I invite.
                </label>
                <Button type="submit" className="min-h-11 w-full">
                  {setup.isPending
                    ? "Setting up…"
                    : editingProfile
                      ? "Save teacher profile"
                      : "Create my teacher workspace"}
                </Button>
                {editingProfile && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                    onClick={() => setEditingProfile(false)}
                  >
                    Cancel
                  </Button>
                )}
              </fieldset>
              {setup.error && <SchoolError error={setup.error} />}
            </form>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Only approved pupils’ new 11+ practice is shared. Medicine
              interviews and earlier practice stay private. Pupils can leave a
              class to stop sharing.
            </p>
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {data.teacher.school_name} · {data.teacher.display_name}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold">
                Your classes
              </h1>
              <p className="mt-2 text-muted-foreground">
                See who is practising and where a little guidance could help.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setName(data.teacher!.display_name);
                  setSchool(data.teacher!.school_name);
                  setConfirmed(true);
                  setup.reset();
                  setEditingProfile(true);
                }}
              >
                Edit teacher profile
              </Button>
              <Button
                className="min-h-11"
                onClick={() => setShowCreate((v) => !v)}
                aria-expanded={showCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                New class
              </Button>
            </div>
          </div>
          {(showCreate || !data.classes.length) && (
            <section className="max-w-2xl rounded-2xl border bg-card p-6">
              <h2 className="mb-5 font-display text-xl font-semibold">
                Create a class
              </h2>
              <ClassForm
                busy={create.isPending}
                onSubmit={(d) => create.mutateAsync(d)}
              />
              {create.error && (
                <div className="mt-4">
                  <SchoolError error={create.error} />
                </div>
              )}
            </section>
          )}
          <div className="flex gap-2" role="group" aria-label="Class status">
            <Button
              variant={!archived ? "default" : "outline"}
              onClick={() => setArchived(false)}
            >
              Active classes
            </Button>
            <Button
              variant={archived ? "default" : "outline"}
              onClick={() => setArchived(true)}
            >
              Archived
            </Button>
          </div>
          {!classes.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              {archived
                ? "No archived classes."
                : "Your first class will appear here."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  to={`/schools/${c.id}`}
                  className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Users size={22} />
                    </span>
                    {c.pending > 0 && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {c.pending} join request{c.pending === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 break-words font-display text-xl font-semibold">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.year_group || "Mixed year groups"} · {c.students} pupil
                    {c.students === 1 ? "" : "s"}
                  </p>
                  <div className="my-5 grid grid-cols-2 gap-4 border-y py-4">
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">
                        {c.stats.this_week}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        interviews this week
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">
                        {c.stats.unreviewed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        awaiting your review
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Open class
                    <ArrowRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Activity updates every 30 seconds. Weekly targets use Monday–Sunday
            in UK time. Each pupil uses their own practice account and credits.
          </p>
        </>
      )}
    </SchoolLayout>
  );
}
