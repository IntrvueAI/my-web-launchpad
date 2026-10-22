import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { InterviewPlatform } from "@/components/InterviewPlatform";
import { LabNoteEditor } from "@/components/admin/lab/LabNoteEditor";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import { brainVersion, CURRENT_BRAIN_VERSION } from "@/interview/engine/brainVersions";
import { LAB_INTERVIEWS, LAB_PLATFORM_LABEL, labPlatformOf } from "@/lib/interviewLab";
import { PREVIEW_FEATURES } from "@/lib/previewFeatures";

const SERVER_PREVIEWS = new Set(PREVIEW_FEATURES.filter((f) => f.server).map((f) => f.id as string));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Runs one lab test interview: a dated version or a draft, without using credits. */
export default function AdminLabRun() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdminStatus();
  const [params] = useSearchParams();
  const [reference, setReference] = useState<string | null>(null);
  const typeId = params.get("type") ?? "";
  const versionId = params.get("version") ?? CURRENT_BRAIN_VERSION;
  const draftId = params.get("draft");
  const draftName = params.get("draftName");
  const previews = (params.get("previews") ?? "").split(",").filter((p) => SERVER_PREVIEWS.has(p));
  const platform = labPlatformOf(typeId);
  const interviewType = INTERVIEW_TYPES[typeId];
  const version = brainVersion(versionId);
  const valid = !!interviewType && LAB_INTERVIEWS[platform].includes(typeId) && !!version && (!draftId || UUID.test(draftId));
  const lab = useMemo(
    () => (valid ? { version: versionId, ...(draftId ? { draftId } : {}), previews } : undefined),
    [valid, versionId, draftId, previews.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onReference = useCallback((ref: string) => setReference(ref), []);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!isAdmin || !user) return <div className="flex min-h-screen items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[60] border-b bg-[#0A1E2B] px-4 py-2 text-sm text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0 text-[#19B5CC]" aria-hidden />
            <strong>Interview Lab test</strong>
            <span className="text-white/70">
              {LAB_PLATFORM_LABEL[platform]} · {version ? `${version.label} (${version.date})` : "Unknown version"}
              {draftId ? ` · Draft: ${draftName ?? "custom"}` : ""}
              {previews.length ? ` · Previews: ${previews.join(", ")}` : ""}
            </span>
          </span>
          <Link to={`/admin/lab?platform=${platform}&tab=history`} className="inline-flex items-center gap-1 underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to the lab
          </Link>
        </div>
      </div>
      {!valid ? (
        <p role="alert" className="mx-auto max-w-xl p-8 text-center">This lab link is incomplete. Choose a version and interview from the Interview Lab.</p>
      ) : (
        <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <InterviewPlatform selectedInterviewType={interviewType} lab={lab} onSessionReference={onReference} />
          </div>
          <aside className="space-y-3 border-t p-4 xl:sticky xl:top-12 xl:h-fit xl:border-l xl:border-t-0" aria-label="Test notes">
            <h2 className="font-semibold">Notes on this test</h2>
            <p className="text-xs text-muted-foreground">
              Saved against this interview, so you can compare versions later in Test history. No credits are used.
            </p>
            <LabNoteEditor ownerId={user.id} sessionReference={reference} interviewType={typeId} version={versionId} draftId={draftId} />
          </aside>
        </div>
      )}
    </div>
  );
}
