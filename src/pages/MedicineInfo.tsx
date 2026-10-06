import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";

export default function MedicineInfo({ faq = false }: { faq?: boolean }) {
  const answers = [
    [
      "What can I practise?",
      "Choose a focused station in ethics, communication, motivation or data, or a complete Medicine circuit. Worked examples and the practice studio help you prepare before speaking to the AI interviewer.",
    ],
    [
      "How does feedback work?",
      "Your answers and the interview evidence inform four assessment areas, each scored out of five. The report explains an observed strength and a practical next step. Scores are practice guidance, not predictions of admission or official university marks.",
    ],
    [
      "Are these real university questions?",
      "No. These are original practice scenarios for skills shared across medical school interviews. We offer a general MMI and focused mini interviews, independent of any university.",
    ],
    [
      "What happens to my Intrvue account?",
      "Use the same sign-in details. Your account, saved interviews and credits use the existing service. You may need to sign in again on this domain; notes saved only in your browser stay on the device and address where you wrote them.",
    ],
    [
      "Can I use a keyboard?",
      "Yes. The interview room includes typed answers alongside microphone controls and a device check.",
    ],
    [
      "How do private trials work?",
      "Your host shares an invitation link. Enter your name and acknowledge that your host can see your trial transcripts and feedback. Trials have their own interview allowance and do not require your host’s login.",
    ],
  ];
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-10 pb-28 text-foreground">
        <div className="mx-auto max-w-3xl">
          <a className="font-display text-xl font-semibold" href="/">
            MMI Practice
          </a>
          <h1 className="mb-6 mt-12 font-display text-4xl font-semibold">
            {faq
              ? "Your questions, answered."
              : "Space to practise. Room to improve."}
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            MMI Practice helps prospective medical students develop clear
            reasoning, empathy and reflection through realistic interview
            practice and focused feedback.
          </p>
          <div className="space-y-4">
            {answers.map(([q, a]) => (
              <section key={q} className="rounded-2xl border bg-card p-6">
                <h2 className="mb-3 text-lg font-semibold">{q}</h2>
                <p className="leading-relaxed text-muted-foreground">{a}</p>
              </section>
            ))}
          </div>
          <a
            className="mt-8 inline-block font-semibold underline"
            href="/medicine/examples"
          >
            Explore Medicine worked answers →
          </a>
        </div>
      </main>
    </MedicineTheme>
  );
}
