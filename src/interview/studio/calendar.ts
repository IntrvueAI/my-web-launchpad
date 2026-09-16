import type { PracticeProfile } from "./practice";

/** Calendar dates, not elapsed 24-hour periods: safe across daylight saving changes. */
export function practiceDates(
  goal: PracticeProfile["goal"],
  firstDay: string,
): string[] {
  const start = Date.parse(`${firstDay}T00:00:00Z`);
  if (!Number.isFinite(start)) return [];
  const offsets =
    goal.days === 3
      ? [0, 2, 4]
      : goal.days === 5
        ? [0, 1, 2, 3, 4]
        : [0, 1, 2, 3, 4, 5, 6];
  return Array.from({ length: 14 }, (_, i) => i)
    .filter((i) => offsets.includes(i % 7))
    .map((i) => new Date(start + i * 86400000).toISOString().slice(0, 10))
    .filter((date) => !goal.interviewDate || date < goal.interviewDate);
}
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
/** RFC 5545 content lines are folded at 75 octets, keeping UTF-8 characters intact. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let output = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > 75) {
      output += "\r\n ";
      size = 1;
    }
    output += char;
    size += bytes;
  }
  return output;
}
export function practiceCalendar(
  goal: PracticeProfile["goal"],
  firstDay: string,
  now = Date.now(),
): string {
  const stamp = new Date(now)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//intrvue.ai//Medicine Practice//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const date of practiceDates(goal, firstDay)) {
    const day = date.replace(/-/g, "");
    const nextDay = new Date(Date.parse(date + "T00:00:00Z") + 86400000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:medicine-practice-${day}@intrvue.ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      "SUMMARY:Medicine interview practice",
      `DESCRIPTION:${escapeText(`${goal.minutes}-minute routine: attempt a question, reflect on the reasoning and choose one next step. Open your intrvue Medicine practice studio. Focus: ${goal.focus === "all" ? "a balanced mix" : goal.focus.replace(/-/g, " ")}.`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
