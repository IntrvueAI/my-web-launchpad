import { z } from "zod";
import { MEDICINE_MMI_EXAMPLES } from "@/data/medicine-mmi-examples";
import {
  profileSchema,
  parseProfile,
  mergeProfiles,
} from "@/interview/studio/practice";
const draftSchema = z.object({
  draft: z.string().max(6000),
  followUps: z.array(z.string().max(2000)).max(2),
  checked: z.array(z.number().int().min(0).max(20)).max(20),
});
const backupSchema = z.object({
  format: z.literal("mmi-practice-notes"),
  version: z.literal(1),
  scope: z.string().max(100),
  createdAt: z.string().datetime(),
  profile: profileSchema.nullable(),
  examples: z
    .array(z.object({ stationId: z.string().max(100), attempt: draftSchema }))
    .max(24),
});
export type MedicineBackup = z.infer<typeof backupSchema>;
const profileKey = (scope: string) => `intrvue:medicine-studio:v1:${scope}`;
const exampleKey = (scope: string, id: string) =>
  `intrvue:mmi-example:v1:${scope}:${id}`;

export function exportMedicineNotes(
  storage: Storage,
  scope: string,
): MedicineBackup {
  const raw = storage.getItem(profileKey(scope));
  return backupSchema.parse({
    format: "mmi-practice-notes",
    version: 1,
    scope,
    createdAt: new Date().toISOString(),
    profile: raw ? profileSchema.parse(JSON.parse(raw)) : null,
    examples: MEDICINE_MMI_EXAMPLES.flatMap((station) => {
      const saved = storage.getItem(exampleKey(scope, station.id));
      return saved
        ? [
            {
              stationId: station.id,
              attempt: draftSchema.parse(JSON.parse(saved)),
            },
          ]
        : [];
    }),
  });
}
export function readMedicineBackup(
  text: string,
  scope: string,
): MedicineBackup {
  if (text.length > 2_000_000)
    throw new Error("Choose a notes export smaller than 2 MB.");
  const parsed = backupSchema.safeParse(JSON.parse(text));
  if (!parsed.success)
    throw new Error("This is not a valid MMI Practice notes export.");
  if (parsed.data.scope !== scope && parsed.data.scope !== "guest")
    throw new Error("Sign into the same account that exported these notes.");
  if (
    parsed.data.examples.some(
      (example) =>
        !MEDICINE_MMI_EXAMPLES.some((s) => s.id === example.stationId),
    )
  )
    throw new Error("This export contains an unknown station.");
  return parsed.data;
}
export function importMedicineNotes(
  storage: Storage,
  scope: string,
  incoming: MedicineBackup,
): number {
  // Validate again at the write boundary; callers cannot supply arbitrary storage keys.
  const backup = readMedicineBackup(JSON.stringify(incoming), scope);
  const updates = new Map<string, string>();
  if (backup.profile) {
    const existing = storage.getItem(profileKey(scope));
    updates.set(
      profileKey(scope),
      JSON.stringify(
        mergeProfiles(parseProfile(existing), backup.profile, !existing),
      ),
    );
  }
  for (const example of backup.examples) {
    const key = exampleKey(scope, example.stationId);
    const existing = storage.getItem(key);
    let hasWork = !!existing;
    try {
      const old = JSON.parse(existing || "{}");
      hasWork =
        !!old.draft ||
        old.followUps?.some((s: string) => !!s) ||
        !!old.checked?.length;
    } catch {
      /* Preserve unrecognised existing work. */
    }
    if (!hasWork) updates.set(key, JSON.stringify(example.attempt));
  }
  const snapshots = new Map(
    [...updates.keys()].map((key) => [key, storage.getItem(key)]),
  );
  try {
    for (const [key, value] of updates) storage.setItem(key, value);
  } catch {
    for (const [key, value] of snapshots) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        /* A browser storage failure must be reported. */
      }
    }
    throw new Error(
      "Your browser could not save the import. Keep your export file and free up browser storage.",
    );
  }
  return updates.size;
}
