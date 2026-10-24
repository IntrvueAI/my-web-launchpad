import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, BookOpenCheck, ClipboardList, ExternalLink, FileSearch, FlaskConical, GitBranch, LayoutTemplate,
  Link2, ListChecks, Megaphone, MessageSquareText, Mic, Route, School, ScrollText, Sparkles, Stethoscope,
  GraduationCap, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { SCHOOL_ORIGIN, isMedicineSite } from "@/lib/site";

export type AdminPlatform = "medicine" | "11plus";
const KEY = "admin:platform:v1";

interface Tool {
  label: string;
  detail: string;
  icon: LucideIcon;
  to?: string;
  href?: string;
  tab?: string;
  external?: boolean;
}
interface Group {
  title: string;
  tools: Tool[];
}

/** Grouped admin tools for each platform; everything shared appears on both. */
export function adminGroups(platform: AdminPlatform): Group[] {
  const medicine = platform === "medicine";
  return [
    {
      title: "Test & improve",
      tools: [
        { label: "Interview Lab", detail: "Replay dated versions, try drafts, compare notes", icon: FlaskConical, to: `/admin/lab?platform=${platform}` },
        { label: "Sandbox", detail: "Clara reads your script, for demos and ads", icon: Megaphone, to: `/admin/lab?platform=${platform}&tab=sandbox` },
        { label: "Preview features", detail: "Switch unreleased changes on in your browser", icon: Sparkles, to: "/admin/preview-features" },
        medicine
          ? { label: "Landing page designs", detail: "Compare Medicine landing page mock-ups", icon: LayoutTemplate, to: "/admin/landing-previews" }
          : { label: "Schools page", detail: "Open the 11+ schools page", icon: School, href: isMedicineSite() ? `${SCHOOL_ORIGIN}/schools` : "/schools", external: true },
        medicine
          ? { label: "Medicine site", detail: "Open the public Medicine page", icon: Stethoscope, to: "/medicine", external: true }
          : { label: "Replay onboarding", detail: "Walk through the 11+ welcome flow", icon: Route, to: "/?replayOnboarding=true", external: true },
        ...(medicine ? [] : [{ label: "Dashboard 2 preview", detail: "Try the sidebar dashboard layout", icon: LayoutTemplate, to: "/?dashboardLayout=sidebar", external: true }]),
      ],
    },
    {
      title: "Beta testing & feedback",
      tools: [
        { label: medicine ? "Medicine beta testing" : "11+ beta testing", detail: "Create private two-interview tester links", icon: Link2, to: medicine ? "/admin/guest-trials" : "/admin/11plus-trials" },
        { label: "Tester feedback", detail: "Each tester's interviews and trial review", icon: MessageSquareText, to: `/admin/feedback?view=testers&product=${platform}` },
        { label: "Comments & ratings", detail: "Website feedback and after-interview comments", icon: ClipboardList, to: "/admin/feedback?view=comments" },
        { label: "Creator programme", detail: "Creator links, discounts, payouts and margins", icon: Users, to: "/admin/creators" },
      ],
    },
    {
      title: "Content",
      tools: medicine
        ? [
            { label: "Review sourced questions", detail: "Approve or reject proposed Medicine questions", icon: BookOpenCheck, to: "/admin/medicine-review" },
            { label: "Medicine portal", detail: "Medicine content and research tools", icon: Stethoscope, to: "/admin/medicine-portal" },
            { label: "Build journal", detail: "Release notes and research sources", icon: ScrollText, to: "/admin/medicine-lab" },
            { label: "Medicine interviews", detail: "Launch any Medicine format, including pilots", icon: ListChecks, to: "/admin/medicine-interviews" },
            { label: "Question bank", detail: "Edit live questions", icon: FileSearch, tab: "questions" },
          ]
        : [
            { label: "Question bank", detail: "Edit live questions", icon: FileSearch, tab: "questions" },
            { label: "Daily question", detail: "Schedule the daily 11+ question", icon: ListChecks, tab: "daily" },
            { label: "Question review", detail: "Overnight question batch", icon: BookOpenCheck, to: "/admin/question-review" },
            { label: "Thought-provoking questions", detail: "Review the thought-provoking batch", icon: BookOpenCheck, to: "/admin/interview-question-review" },
            { label: "Interview flow builder", detail: "Build custom interview flows", icon: GitBranch, to: "/admin/interview-flow-builder" },
            { label: "School finder", detail: "Schools and their interview formats", icon: GraduationCap, to: "/admin/school-finder" },
            { label: "Unreleased interviews", detail: "Interviews not yet on the picker", icon: ListChecks, to: "/admin/unreleased-interviews" },
          ],
    },
    {
      title: "Operations",
      tools: [
        { label: "Live interviews & health", detail: "Who is interviewing now and system status", icon: Activity, tab: "system" },
        { label: medicine ? "Medicine credits" : "11+ credits", detail: "Look up a user and add, remove or refund credits", icon: Wallet, tab: "users" },
        { label: "Logs", detail: "Server and app events", icon: ScrollText, to: "/admin/logs" },
        { label: "Speech-to-text comparison", detail: "Compare transcription engines", icon: Mic, to: "/admin/stt-bakeoff" },
      ],
    },
  ];
}

export function useAdminPlatform(): [AdminPlatform, (p: AdminPlatform) => void] {
  const [platform, setPlatform] = useState<AdminPlatform>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "medicine" || saved === "11plus") return saved;
    } catch { /* Defaults below. */ }
    return isMedicineSite() ? "medicine" : "11plus";
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, platform); } catch { /* Remembering is optional. */ }
  }, [platform]);
  return [platform, setPlatform];
}

/** Admin home: a platform switch and grouped, described tools instead of a strip of buttons. */
export function AdminHub({ platform, onPlatform, onOpenTab }: { platform: AdminPlatform; onPlatform: (p: AdminPlatform) => void; onOpenTab: (tab: string) => void }) {
  const card = "group flex h-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <section aria-label="Admin tools" className="mb-8 space-y-5">
      <div role="group" aria-label="Platform" className="inline-flex rounded-xl border bg-card p-1">
        {([["medicine", "Medicine · MMI Practice", Stethoscope], ["11plus", "11+ · intrvue.ai", GraduationCap]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" aria-pressed={platform === id} onClick={() => onPlatform(id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${platform === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {adminGroups(platform).map((group) => (
          <div key={group.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.title}</h2>
            <ul className="space-y-2">
              {group.tools.map((tool) => {
                const inner = (
                  <>
                    <tool.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        {tool.label}
                        {tool.external && <ExternalLink className="h-3 w-3 text-muted-foreground" aria-label="(opens in a new tab)" />}
                      </span>
                      <span className="block text-xs text-muted-foreground">{tool.detail}</span>
                    </span>
                  </>
                );
                return (
                  <li key={tool.label}>
                    {tool.tab ? (
                      <button type="button" className={`${card} w-full`} onClick={() => onOpenTab(tool.tab!)}>{inner}</button>
                    ) : tool.href ? (
                      <a className={card} href={tool.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                    ) : (
                      <Link className={card} to={tool.to!} {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
