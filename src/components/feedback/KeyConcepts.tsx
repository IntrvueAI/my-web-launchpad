import { BookOpen, ExternalLink } from "lucide-react";

export interface KeyConcept {
  id: string;
  name: string;
  meaning: string;
  pattern: RegExp;
  source: { label: string; url: string };
}

const GMC_CONSENT = { label: "GMC: Decision making and consent", url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/decision-making-and-consent/the-seven-principles-of-decision-making-and-consent" };
const GMC_GMP = { label: "GMC: Good medical practice", url: "https://www.gmc-uk.org/cdn/documents/good-medical-practice-2024---english_pdf-102607294.pdf" };
const BMA_ETHICS = { label: "BMA: Ethics guidance", url: "https://www.bma.org.uk/advice-and-support/ethics" };

/** Concepts shown only when they arise in the interview. Explanations are introductory, not legal advice. */
export const KEY_CONCEPTS: KeyConcept[] = [
  { id: "autonomy", name: "Autonomy", meaning: "A patient's right to make informed decisions about their own care, including refusing treatment, even when others disagree.", pattern: /\bautonom|right to (?:choose|decide|refuse)/i, source: GMC_CONSENT },
  { id: "consent", name: "Consent", meaning: "Agreement to an examination or treatment, given voluntarily by someone with capacity after they have the information they need.", pattern: /\bconsent/i, source: GMC_CONSENT },
  { id: "capacity", name: "Capacity", meaning: "The ability to make a specific decision at a specific time: understanding, retaining and weighing the information, and communicating a choice. Adults are presumed to have capacity unless assessed otherwise.", pattern: /\b(?:mental )?capacity\b/i, source: { label: "NHS: Mental Capacity Act", url: "https://www.nhs.uk/social-care-and-support/making-decisions-for-someone-else/mental-capacity-act/" } },
  { id: "confidentiality", name: "Confidentiality", meaning: "Keeping patient information private, sharing it only with consent, for direct care, or when the law or a serious public interest requires it.", pattern: /confidential/i, source: { label: "GMC: Confidentiality", url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/confidentiality" } },
  { id: "gillick", name: "Gillick competence", meaning: "A young person under 16 can consent to their own treatment if they have enough understanding and maturity to fully understand what is proposed.", pattern: /gillick|\b1[3-5]-year-old|\bunder 16\b/i, source: { label: "NSPCC: Gillick competence and Fraser guidelines", url: "https://learning.nspcc.org.uk/child-protection-system/gillick-competence-fraser-guidelines" } },
  { id: "beneficence", name: "Beneficence and non-maleficence", meaning: "Acting to benefit the patient and avoiding harm, weighing the likely benefits of an option against its risks.", pattern: /beneficen|maleficen|best interests?|do no harm/i, source: BMA_ETHICS },
  { id: "justice", name: "Justice", meaning: "Fairness in how limited healthcare resources, time and treatments are shared between patients.", pattern: /\bjustice\b|\bfair(?:ly|ness)?\b.{0,30}\b(?:allocat|distribut|resource)|\bscarce\b|\bresource allocation/i, source: BMA_ETHICS },
  { id: "concerns", name: "Raising concerns", meaning: "Healthcare professionals have a duty to act when patient safety, care or dignity may be at risk, usually starting with local routes.", pattern: /patient safety|rais(?:e|ing) (?:a |the |my )?concern|escalat/i, source: { label: "GMC: Raising a concern", url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/raising-and-acting-on-concerns/part-1-raising-a-concern" } },
  { id: "boundaries", name: "Professional boundaries", meaning: "Keeping relationships with patients professional, including care with gifts, so that care is not, and is not seen to be, influenced.", pattern: /\bgifts?\b|\bboundar/i, source: GMC_GMP },
  { id: "candour", name: "Honesty and candour", meaning: "Being open and honest with patients, including explaining clearly when something has gone wrong.", pattern: /\bcandour|\bhonest(?:y|ly)?\b|\btruth/i, source: GMC_GMP },
];

export function conceptsIn(text: string): KeyConcept[] {
  return KEY_CONCEPTS.filter((c) => c.pattern.test(text));
}

export function KeyConcepts({ text }: { text: string }) {
  const found = conceptsIn(text);
  if (!found.length) return null;
  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="key-concepts-heading">
      <h3 id="key-concepts-heading" className="flex items-center gap-2 font-semibold">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden /> Key concepts in this interview
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">For further reading. These are introductions, not part of your score.</p>
      <dl className="mt-4 space-y-4">
        {found.map((c) => (
          <div key={c.id}>
            <dt className="font-medium">{c.name}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {c.meaning}{" "}
              <a href={c.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
                {c.source.label} <ExternalLink className="h-3 w-3" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
