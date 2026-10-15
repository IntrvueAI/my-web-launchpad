import { useEffect, useState } from "react";

/**
 * Preview features: larger product changes that ship in the code but stay off for everyone until a
 * founder approves them. An administrator can switch one on for their own browser at
 * /admin/preview-features to test it on the live site. Approving a feature means setting
 * `approved: true` here, which turns it on for every visitor.
 */
export interface PreviewFeature {
  id: PreviewFeatureId;
  title: string;
  change: string;
  howToTest: string;
  approved: boolean;
  /** Sent to the interview server because it changes what Clara says. */
  server?: boolean;
}

export const PREVIEW_FEATURE_IDS = [
  "silent-reading",
  "thinking-pause",
  "hidden-station-themes",
  "roleplay-read-then-act",
  "chat-transcript",
  "readable-room",
  "key-concepts",
] as const;
export type PreviewFeatureId = (typeof PREVIEW_FEATURE_IDS)[number];

export const PREVIEW_FEATURES: PreviewFeature[] = [
  {
    id: "silent-reading",
    title: "Silent reading time",
    change: "During a station's reading time, spoken and typed answers are held back with a notice. Answering opens when the clock reaches zero or the candidate selects I'm ready.",
    howToTest: "Start a mini interview and try speaking or typing before the reading clock ends.",
    approved: false,
  },
  {
    id: "thinking-pause",
    title: "Longer thinking pause",
    change: "Clara waits about three seconds of silence (instead of under one) before replying, so candidates can add to or correct an answer. A 'Still listening — Send now' prompt shows during the wait.",
    howToTest: "Answer, pause briefly mid-thought, then continue. Clara should treat both parts as one answer.",
    approved: false,
  },
  {
    id: "hidden-station-themes",
    title: "Hide station themes in the full MMI",
    change: "Clara announces 'Station 2 of 6' without naming the theme (ethics, motivation and so on), so candidates interpret the question themselves. Themes are still shown in feedback. Mini interviews keep their chosen theme.",
    howToTest: "Start the full MMI practice mock and listen to each station introduction.",
    approved: false,
    server: true,
  },
  {
    id: "roleplay-read-then-act",
    title: "Roleplay: read first, then the actor begins",
    change: "For roleplay stations Clara no longer reads the brief and the actor's first line aloud. The candidate reads the written brief silently; when reading time ends (or they select I'm ready) the actor begins with their opening line.",
    howToTest: "Start a Communication & empathy mini interview and follow the roleplay start.",
    approved: false,
    server: true,
  },
  {
    id: "chat-transcript",
    title: "Chat-style transcript in feedback",
    change: "The feedback transcript is shown as message bubbles, interviewer on the left and candidate on the right, instead of blocks of text. Highlights still work.",
    howToTest: "Open any saved interview feedback and expand Transcript & highlighted moments.",
    approved: false,
  },
  {
    id: "readable-room",
    title: "Lighter, larger-text interview room",
    change: "The interview room uses a light background with larger text and stronger contrast, for easier reading and accessibility.",
    howToTest: "Start any Medicine interview and compare readability of the brief and transcript.",
    approved: false,
  },
  {
    id: "key-concepts",
    title: "Key concepts with learning links",
    change: "Feedback lists ethical concepts the station touched on (for example autonomy, consent, capacity, confidentiality) with a one-line explanation and a link to official guidance for further reading.",
    howToTest: "Complete an ethics station and look for Key concepts in the feedback.",
    approved: false,
  },
];

const STORAGE_KEY = "mmi:preview-features:v1";
const EVENT = "mmi-preview-features-changed";

function readOverrides(): Partial<Record<PreviewFeatureId, boolean>> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

export function isPreviewFeatureOn(id: PreviewFeatureId): boolean {
  const override = readOverrides()[id];
  return typeof override === "boolean" ? override : !!PREVIEW_FEATURES.find((f) => f.id === id)?.approved;
}

export function setPreviewFeature(id: PreviewFeatureId, on: boolean | null) {
  const next = readOverrides();
  if (on === null) delete next[id];
  else next[id] = on;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Without storage the default applies. */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Server-relevant features that are on in this browser, sent with interview requests. */
export function serverPreviewFeatures(): PreviewFeatureId[] {
  return PREVIEW_FEATURES.filter((f) => f.server && isPreviewFeatureOn(f.id)).map((f) => f.id);
}

export function usePreviewFeature(id: PreviewFeatureId): boolean {
  const [on, setOn] = useState(() => isPreviewFeatureOn(id));
  useEffect(() => {
    const update = () => setOn(isPreviewFeatureOn(id));
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [id]);
  return on;
}
