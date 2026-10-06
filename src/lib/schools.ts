import { supabase } from "@/integrations/supabase/client";
import { censorFeedback } from "@/interview/shared/transcript";
import type { SummaryFeedback } from "@/components/feedback/FeedbackSummary";
import type { Json } from "@/integrations/supabase/types";

export interface SchoolStats {
  completed: number;
  this_week: number;
  practice_days: number;
  minutes: number;
  last_practice: string | null;
  unreviewed: number;
  average_score: number | null;
  scored: number;
}
export interface SchoolClass {
  id: string;
  name: string;
  year_group: string;
  weekly_target: number;
  created_at: string;
  archived_at: string | null;
  students: number;
  pending: number;
  stats: SchoolStats;
}
export interface ClassSettings extends Omit<SchoolClass, 'stats' | 'students' | 'pending'> {
  invite_token: string;
  invite_expires_at: string;
  invite_enabled: boolean;
}
export type MembershipStatus =
  | "pending"
  | "active"
  | "left"
  | "removed"
  | "declined";
export interface ClassStudent {
  student_id: string;
  display_name: string;
  status: MembershipStatus;
  requested_at: string;
  approved_at: string | null;
  stats: SchoolStats | null;
}
export interface TeacherNote {
  session_id: string;
  interview_type: string;
  started_at: string;
  note: string;
  reviewed_at: string | null;
}
export interface StudentMembership {
  id: string;
  name: string;
  year_group: string;
  teacher_name: string;
  school_name: string;
  weekly_target: number;
  status: MembershipStatus;
  approved_at: string | null;
  requested_at: string;
  archived_at: string | null;
  display_name: string;
  stats: SchoolStats;
  teacher_notes: TeacherNote[];
}
export interface SchoolState {
  teacher: { display_name: string; school_name: string } | null;
  classes: SchoolClass[];
  memberships: StudentMembership[];
}
export interface ClassDetail {
  class: ClassSettings;
  students: ClassStudent[];
  stats: SchoolStats;
}
export interface SchoolInterview {
  id: string;
  interview_type: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  minutes: number;
  feedback_id: string | null;
  score: number | null;
  reviewed_at: string | null;
  note: string;
  note_version: number;
}
export interface SchoolStudentDetail {
  student: { id: string; name: string; approved_at: string };
  stats: SchoolStats;
  interviews: SchoolInterview[];
  total: number;
  page: number;
}
export interface SchoolFeedback {
  feedback: (SummaryFeedback & { id: string; interview_type: string }) | null;
  note?: string;
  note_version?: number;
  reviewed_at?: string | null;
}
export interface ClassInvitation {
  id: string;
  name: string;
  year_group: string;
  teacher_name: string;
  school_name: string;
  weekly_target: number;
  status: MembershipStatus | null;
}
export async function schoolApi<T>(
  action: string,
  payload: Record<string, Json | undefined> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc("school_portal", {
    p_action: action,
    p_payload: payload,
  });
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    if (error.code === "22P02")
      throw new Error(
        "This class link is not valid. Open it again from your dashboard.",
      );
    throw new Error(
      "The school dashboard could not connect. Please try again.",
    );
  }
  return censorFeedback(data) as T;
}
export const schoolKeys = {
  root: (userId: string) => ["schools", userId] as const,
  state: (userId: string) => ["schools", userId, "state"] as const,
  class: (userId: string, classId: string) =>
    ["schools", userId, "class", classId] as const,
};
export const schoolDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/London",
      })
    : "No practice yet";
export const schoolDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

export function classInviteToken(value: string): string | null {
  const clean = value.trim();
  if (/^[a-f0-9]{32}$/.test(clean)) return clean;
  try {
    const link = new URL(clean);
    if (
      !["http:", "https:"].includes(link.protocol) ||
      link.username ||
      link.password
    )
      return null;
    const host = link.hostname.toLowerCase();
    if (
      !["intrvue.ai", "www.intrvue.ai", window.location.hostname].includes(host)
    )
      return null;
    return (
      link.pathname.match(/^\/join-class\/([a-f0-9]{32})\/?$/)?.[1] ?? null
    );
  } catch {
    return null;
  }
}
/** Escape CSV delimiters and prevent spreadsheet formula execution from pupil names. */
export function schoolCsvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function classProgressCsv(students: ClassStudent[]): string {
  const rows: unknown[][] = [
    [
      "Pupil",
      "Status",
      "Completed this week",
      "Completed since approval",
      "Practice days",
      "Approx. interview minutes",
      "11+ average /20",
      "Unreviewed",
      "Last practice (UK)",
    ],
  ];
  for (const s of students.filter((s) => s.status === "active"))
    rows.push([
      s.display_name,
      s.status,
      s.stats?.this_week,
      s.stats?.completed,
      s.stats?.practice_days,
      s.stats?.minutes,
      s.stats?.average_score,
      s.stats?.unreviewed,
      s.stats?.last_practice ? schoolDateTime(s.stats.last_practice) : "",
    ]);
  return (
    "\uFEFF" + rows.map((row) => row.map(schoolCsvCell).join(",")).join("\r\n")
  );
}
