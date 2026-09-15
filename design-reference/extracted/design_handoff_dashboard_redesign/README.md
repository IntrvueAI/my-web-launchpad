# Handoff: intrvue.ai student dashboard redesign (coral/white)

## Overview

A minimalist redesign of the logged-in student dashboard for **intrvue.ai**, a UK school-interview prep platform with two product lines (11+ interview practice, and Medicine MMI practice). Students practise live spoken mock interviews with an AI interviewer, "Clara", who appears as a real-time video avatar, and afterwards receive written, banded feedback.

The current dashboard is dark and gamified ("warm-scholar", Pip mascot, bright gradients, badges). This redesign replaces it with the calm coral/white visual language already used on the Medicine marketing landing page, so the logged-in product reads as the same site.

It also proposes a revised information architecture: the current eight tabs collapse to five, with two new tabs (Progress, Schools) and a third smaller proposal (Interview diary).

## About the design files

`Dashboard.dc.html` in this bundle is a **design reference created in HTML** — a static prototype showing intended look, hierarchy and copy. It is **not production code to copy**. The task is to recreate these screens in the target codebase using its existing framework, component library and conventions (React, Next.js, etc.). If no environment exists yet, pick the most appropriate one and implement there.

The file is authored as a single self-contained streaming component; it needs `support.js` (also bundled) sitting alongside it to render. Open it in a browser to view all screens on one canvas. It uses **inline styles only** and **no CSS classes** — that is an authoring constraint of the prototype tool, not a recommendation. In the real codebase, extract the values below into whatever token/theme layer already exists.

Fixed pixel widths in the prototype (1440 desktop frames, 390 mobile frames) are **artboard sizes**, not implementation constraints. Build the real thing fluid; see "Responsive behaviour".

## Fidelity

**High fidelity.** Colours, typography, spacing, radii and shadows are final and come from the published intrvue.ai coral token set. Copy is final-quality and can ship as written. Recreate pixel-accurately using the codebase's existing primitives.

Two caveats:
- Nav/tab-bar icons are represented as plain rounded squares — the prototype deliberately does not draw icons. Use the icon set already in the codebase.
- The Clara video feed and the student's self-view are striped placeholders; they are live WebRTC/avatar video surfaces in the real product.

---

## Design tokens

Source of truth: `src/assets/medicine-landing-coral.html` (admin preview at `/admin/medicine-landing-preview`).

### Colour

| Token | Value | Used for |
|---|---|---|
| `--ink` | `#1C2029` | Primary text, headings |
| `--muted` | `#6B7280` | Body copy, secondary text |
| `--tertiary` | `#9A9488` | Timestamps, fine print, inactive labels |
| `--line` | `rgba(28,32,41,.09)` | Default borders, dividers |
| `--line-strong` | `rgba(28,32,41,.15)` | Ghost-button borders, stronger dividers |
| `--coral` | `#FF7F50` | Brand primary |
| `--coral-dark` | `#E8622F` | Links, hover, dark-on-light accent text |
| `--coral-soft` | `#FFE4D6` | Active tab pill, badges, icon chips |
| `--bg` | `#FAFAF8` | App background (warm off-white) |
| `--card` | `#FFFFFF` | Cards, inputs, panels |
| `--track` | `#F1EFEA` | Progress-bar tracks, segmented-control ground |

Additional values used by this redesign (all consistent with the landing page's three-colour tint rotation):

| Value | Used for |
|---|---|
| `#E8F1FF` / `#2563EB` | "NEW" proposal badges in the IA map (annotation only — not product chrome) |
| `#10B981` | "What went well" marker, positive delta text, connection-good dot |
| `rgba(232,98,47,.18)` | Border on CTA/soft-coral panels |
| `#FFF3EC` → `#FFE9DD` | CTA panel gradient (see below) |
| `#DEDBD3` | Inactive bottom-nav icon placeholder |

Progress-bar chart ramp (Progress tab, band-per-session bars, oldest → newest): `#FFE4D6`, `#FFD3BC`, `#FFB894`, `#FF9F6B`, `#FF7F50`.

### Gradients

- **Primary button / brand:** `linear-gradient(135deg, #FF7F50 0%, #FF9F6B 100%)`
- **CTA / next-interview panel:** `linear-gradient(180deg, #FFF3EC, #FFE9DD)` with `1px solid rgba(232,98,47,.18)`
- Progress-bar fills reuse the primary gradient.

### Shadows

- **Soft (cards):** `0 2px 10px -4px rgba(28,32,41,.08)`
- **Medium (frames, hero mock, video):** `0 10px 30px -10px rgba(28,32,41,.12)`
- **Primary button:** `0 10px 26px -10px rgba(232,98,47,.55)`; lifts 2px on hover

### Radius

| Element | Radius |
|---|---|
| Cards, panels, app frame | 18–20px (20px desktop, 18px mobile) |
| Inner/nested cards, list rows, chat bubbles | 14–16px |
| Buttons, inputs | 12px |
| Tab pills, credit pill, segmented control | 9–11px |
| Small badges, milestone chips, score pills | 6–8px |
| Progress bars / streak squares | 999px / 4–6px |
| Phone frame | 34px |

### Typography

Google Fonts import:
`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap`

- **Headings:** Bricolage Grotesque, 700 (800 for the largest display sizes)
- **Body / UI:** Inter Tight, 400–600

| Role | Desktop | Mobile |
|---|---|---|
| Page greeting / page title | 30–32px / 1.1, Bricolage 700, `-.015em` | 25px / 1.15 |
| Card headline (e.g. "A six-station Leeds circuit") | 25–26px / 1.15, Bricolage 700, `-.015em` | 20px / 1.2 |
| Section heading in card | 17–18px / 1, Bricolage 700 | 15–16px |
| Big number (band, credits) | 34–44px / 1, Bricolage 700, `-.02em` | 26px |
| Body | 15–16px / 1.6, Inter Tight 400 | 14–14.5px / 1.55 |
| Secondary / meta | 13–14.5px, Inter Tight 400–500 | 13px |
| Nav tab | 14.5px, Inter Tight 500 (600 active) | 11px (bottom bar) |
| Eyebrow / section label | 11.5–12px, Inter Tight 600, `letter-spacing:.14em`, uppercase | 11px |
| Timer | 20px Bricolage 700, `font-variant-numeric: tabular-nums` | 17px |

Long prose blocks use `text-wrap: pretty`.

### Spacing & sizing

- Desktop shell padding: `34px 40px 44px`; card padding `26–30px 28–32px`
- Mobile padding: `20px` horizontal; card padding `20px`
- Gap between cards: 20px desktop, 14px mobile
- Desktop top nav: 68px tall (64px in-session), `0 28px` padding, `1px solid var(--line)` bottom
- Mobile bottom nav: 76px tall, five items, `1px solid var(--line)` top
- Buttons: `min-height: 48px`, `padding: 14px 22px`, `border-radius: 12px`
- Mobile tap targets never below 44px
- Home desktop grid: `1fr 336px`, 20px gap
- Feedback desktop grid: `326px 1fr`, 20px gap
- Session desktop grid: `1fr 420px`, 22px gap
- Avatar: 34px circle, `--coral-soft` ground, `--coral-dark` initials

### Buttons

- **Primary:** brand gradient fill, `#FFFFFF` text, Inter Tight 600 15px, primary shadow, 2px lift on hover
- **Ghost:** `#FFFFFF` fill, `1px solid --line-strong`, `--ink` text, same metrics
- **Soft (inside a CTA panel):** `#FFFFFF` fill, `1px solid rgba(232,98,47,.28)`, `--ink` text, `min-height: 44px`
- **Links:** `--coral-dark`, 600 13.5px, trailing `→`; hover `#C94E20`

---

## Information architecture

Current tabs: Home, Practice, Questions, Achievements, Feedback (internally "history"), Credits, Settings, plus a separate Grown-up view.

Proposed nav — **five tabs**:

| Tab | Status | Notes |
|---|---|---|
| **Home** | Redesign | One decision per visit: start the next session. |
| **Practice** | Redesign | Station/subject picker + the live session. **Absorbs Questions** as a "Question bank" sub-view. |
| **Progress** | **NEW** | Band trend over time, per-skill and per-station-type movement. **Absorbs Achievements** as a milestones strip. |
| **Schools** | **NEW** | The published per-university MMI format data, surfaced in-product with "practise this exact format". |
| **Feedback** | Redesign | Past sessions + written assessments. Renamed from "history" in all UI and code-facing strings where user-visible. |

Moved into the account menu (avatar, top right): **Credits & billing**, **Settings**, **Grown-up view**, and **Interview diary** (**NEW** — the real school dates a student enters once, which drive Home's countdown, the Schools "In your diary" flag, and the parent view).

Credits remain one tap away as a live balance pill in the desktop header (and a compact numeric pill on mobile), so the tab is not needed.

**11+ vs Medicine** is a single segmented switch in the header, not a parallel navigation. It changes vocabulary (stations vs. subjects), the Practice catalogue, the Schools dataset and the feedback rubric. The shell is identical. A household using both product lines sees one switch, not two accounts.

---

## Screens

### 1. Home (desktop 1440)

**Purpose:** land, understand where you are, start the right next session in one click.

**Layout:** top nav (68px) → content `34px 40px 44px` → greeting row → two-column grid `1fr 336px`, 20px gap.

**Top nav.** Left: 22px gradient-rounded-square logo mark + "intrvue.ai" (Bricolage 600 15px, `--coral-dark`), then tab row. Active tab = `--coral-soft` pill, `--coral-dark`, 600; inactive = `--muted` 500, `9px 14px` padding. Right: product-line segmented control (`--track` ground, 3px inset, active chip white with soft shadow), credits pill (`24 credits`, ghost styling), avatar.

**Greeting row.** `Good afternoon, Amara` (32px Bricolage 700) + subline in `--muted`: "Leeds is 12 days away. You've done two ethics stations this week and none with a roleplay patient." Right-aligned date in `--tertiary`. The subline is generated: days-to-next-diary-date + a gap observation from recent session history.

**Left column**

1. **Recommended-next card** — white, 20px radius, soft shadow, `30px 32px`. Eyebrow "RECOMMENDED NEXT" in `--coral-dark`; headline "A six-station Leeds circuit"; body explaining prep/station timing and why it's recommended; primary button `Start circuit · 4 credits` + ghost `Choose stations`. Right side: a 250px `--bg` inset panel listing the circuit's stations with durations and a "+ 3 more" row.
2. **How you're scoring** — header + `Open Progress →` link. Grid `200px 1fr`: left, average band `3.4 / 5` (44px Bricolage; "/ 5" in Inter Tight 20px `--tertiary`), caption, and `+0.4 in the last month` in `#10B981`. Right, four skill rows: 150px label / 6px gradient-filled track / right-aligned score.
3. **Recent sessions** — header + `All feedback →`. Three rows separated by `1px solid --line`: date (86px, `--tertiary`), title, band pill (`--coral-soft` / `--coral-dark`), `View feedback` link.

**Right column**

1. **Next real interview** — CTA-gradient panel with coral border. Eyebrow, "University of Leeds", "Tue 21 October · MMI, 7 stations", "12 days away" in `--coral-dark` 700, soft button "See the Leeds format".
2. **Credits** — eyebrow + `Top up` link, `24` at 34px Bricolage, caption "About six full circuits, or twenty single stations."
3. **Keeping it up** — the entire gamification surface. Eyebrow + "6-day streak" text (no flame, no mascot), a seven-square week strip (26px tall, 6px radius: filled days `--coral-soft`, today `--coral`, future `--track`), then text-only badge chips ("Deep Thinker", "On a Roll", "+4") with `--line` borders and `--muted` text.

### 2. Live station (desktop 1440)

**Purpose:** run one MMI station inside a circuit. Chrome drops away — no tabs, no credits, no badges.

**Layout:** 64px session bar → grid `1fr 420px`, 22px gap, `28px 32px 32px`.

**Session bar.** Left: `Leave circuit` ghost pill, circuit name, "Station 3 of 6" in `--tertiary`. Centre: six 26×5px progress pips (`--coral` complete, `--track` remaining). Right: `● Recording` chip (`--coral-soft` / `--coral-dark`), `04:12` timer (20px Bricolage, tabular), "left in station".

**Left column.** 452px striped video surface, 20px radius, medium shadow, monospace placeholder label. Overlays: `● Live` badge top-left (`--coral-dark` fill, white text); bottom-left white status pill "Microphone on · connection good" with a `#10B981` dot; bottom-right 132×88px self-view thumbnail. Below: ghost `Mute`, ghost `Ask Clara to repeat`, spacer, primary `Finish station early`.

**Right column.**
1. **Station brief card** — "STATION 3 · ROLEPLAY" eyebrow + "Prep used · 2:00", the prompt as a 19px Bricolage headline, and a `--muted` note that Clara is playing the patient and reacts to what you say.
2. **Live transcript card** — header + "Auto-saved". Interviewer/patient turns: white card, `--line` border, 14px radius. Student turns: right-aligned, primary-gradient fill, white text, `max-width: 300px`. Each turn labelled above in 10.5px uppercase `--tertiary`. Foot: pulsing coral dot + "Listening to you…". Card sizes to content — do not hard-cap its height; if the transcript can exceed the viewport, scroll it with the newest turn pinned into view (do not use `scrollIntoView`).

### 3. Feedback (desktop 1440)

**Purpose:** read the written, banded assessment for any past session.

**Layout:** standard top nav → title row + `All / Circuits / Single stations` filter (active = `--track` pill) → grid `326px 1fr`.

**Left list.** White card acting as a 10px-padded container; each row 14px radius, `15px 16px`. Selected row: `#FFF3EC` fill, `rgba(232,98,47,.18)` border, `--coral-dark` score. Unselected: transparent, `--tertiary` score. Each row = title, score, and "6 Sep · 6 stations · 48 min".

**Right detail.**
1. **Summary card** — session title (25px Bricolage), timestamp/duration/credits in `--tertiary`, right-aligned band `3.6 / 5` in `--coral-dark` 34px with "Overall band · Good" beneath, then a 16px/1.65 narrative paragraph (max-width 760px).
2. **Two-up strengths / improvements** — equal columns. "What went well" marked with a `#10B981` 9px rounded square; "What to work on" with a `--coral` one. Three items each, separated by `--line` rules, `--muted` 14.5px/1.6. Items are specific and behavioural, never scores restated as prose.
3. **Station by station** — header + `Read full transcript →`. Rows: 2-digit index in `--tertiary`, 210px station name, gradient progress track, right-aligned score.

### 4. Progress (desktop, NEW)

Header strip with active "Progress" pill and "Last 90 days". Headline states the single finding ("You've moved a full band on ethics since July"). Below: a 12-bar band-per-session chart (132px tall, 10px gap, 8px top radius, colour ramp oldest→newest) with a "+0.7 overall" delta in `#10B981` and month labels; a two-up "Strongest station type" / "Least practised" pair, where the second card names the consequence ("Attempted once. Leeds runs two of them."); and a milestones row of text chips — Achievements, demoted to one line.

### 5. Schools (desktop, NEW)

Header strip: active "Schools" pill, "32 UK medical schools · published formats". Headline "Every school runs it differently. Practise the one you're sitting." Search input (12px radius, `--line` border, `--tertiary` placeholder). Featured school card with coral-tinted border: name, "MMI · published 2026 entry", an "In your diary" chip, a three-up stat grid (`7` stations / `2 min` prep before each / `8 min` per station), a caveats line, and a primary "Practise the Leeds format" button that seeds a circuit with that school's exact timings. Below: a compact list of other schools (Manchester "8 stations · no prep time", Glasgow "Single 30-min panel", Newcastle "8 stations · 1 min prep") each with a `Practise` link.

### 6–8. Mobile (390 × 844)

All three mobile screens share: status bar, 20px horizontal padding, 18px card radius, 14px inter-card gap, and a 76px bottom nav with five equal items (20px icon slot + 11px label; active `--coral` / `--coral-dark`, inactive `#DEDBD3` / `--tertiary`).

- **Home** — compact header (logo, numeric credit pill, avatar), greeting, recommended-next card with **stacked full-width** primary + ghost buttons, next-interview CTA strip, and a combined scoring card whose footer carries the streak row (12px squares) instead of a separate gamification card.
- **Live station** — back/"Leave" bar with station counter and timer, full-width six-segment progress bar, 270px video with `Live` badge and 78×56px self-view, station brief, two transcript bubbles, and a bottom action bar (`Mute` 56px + full-width primary `Finish station early`). No bottom tab bar during a session.
- **Feedback (detail)** — back chevron + "Feedback" title, summary card with band, then "What went well", "What to work on" and "Station by station" as stacked cards. The session list is a preceding screen on mobile, not a side column.

---

## Interactions & behaviour

- **Start circuit** → confirm credit spend if balance is low → session screen. Debit on station 1 start, not on click.
- **Product-line switch** — instant, client-side; persists per user. Changes nav vocabulary, catalogue, Schools dataset and rubric. Never reloads to a different shell.
- **Buttons** — primary lifts 2px on hover with the coral shadow deepening; ghost darkens border to `--line-strong` and background to `#FAFAF8`. `transition: transform .15s ease, box-shadow .15s ease`.
- **Cards** — static by default. Only interactive rows (session list, school list) get a hover: background `#FAFAF8`.
- **Progress bars** — animate width from 0 on first paint, 400ms `cubic-bezier(.22,1,.36,1)`, staggered 60ms. Respect `prefers-reduced-motion`.
- **Session timer** — counts down per station; below 0:30 the timer turns `--coral-dark`. No colour flashing or alarm styling — the product must not add stress.
- **Prep phase** — before each station, a prep countdown replaces the transcript panel with the prompt; length comes from the school's format (Leeds 2 min, Manchester 0 — skip the phase entirely).
- **"Listening to you…"** — dot pulses at 1.4s while the mic detects speech; label switches to "Clara is speaking" when the avatar has the floor.
- **Leave circuit** — confirm dialog; partial circuits still generate feedback for completed stations.
- **Feedback list** — selecting a row swaps the detail pane; deep-linkable by session id.
- **Empty states** — a new user sees the recommended-next card, the credits card, and a single "Once you've done a session, your feedback lands here" line in place of the scoring and recent-session cards. Do not render zeroed charts.
- **Loading** — skeletons using `--track` blocks at the real radii; never spinners over full cards.

## Responsive behaviour

Two real breakpoints: below ~900px use the mobile composition (bottom nav, single column, stacked buttons); above, the desktop composition (top nav, two/three-column grids). Between ~900px and 1200px the desktop grids collapse their side column beneath the main column. Content max-width ~1440px, centred, with the frame's fixed widths dropped.

## State

- `productLine: '11plus' | 'medicine'` (persisted)
- `creditBalance: number`
- `diaryDates: { school, date, format }[]` → drives Home countdown and Schools "In your diary"
- `recommendation` — derived server-side from diary dates + station-type coverage + recency
- Session runtime: `circuit`, `stationIndex`, `phase: 'prep' | 'live' | 'between'`, `secondsRemaining`, `micState`, `connectionQuality`, `transcript[]`
- `sessions[]` with per-station scores, band, strengths/improvements
- `streakDays`, `badges[]` — read-only, display-only

## Assets

No image or icon assets are included. Needed in implementation:

- Nav and bottom-bar icons (5 tabs) — use the codebase's existing icon set; the prototype shows rounded-square placeholders.
- Clara live avatar video surface and student self-view — striped placeholders in the prototype.
- The logo mark is a 22px rounded square filled with the brand gradient — replace with the real intrvue.ai mark.
- Fonts load from Google Fonts (link above); self-host if the app already does.

## Files

- `Dashboard.dc.html` — all eight screens on one canvas, in this order: IA map, Home (desktop), Live station (desktop), Feedback (desktop), Progress + Schools (desktop, new tabs), then Home / Live station / Feedback at 390 mobile width.
- `support.js` — runtime required to render the file. Not part of the design; do not port it.

Open `Dashboard.dc.html` directly in a browser with `support.js` beside it.
