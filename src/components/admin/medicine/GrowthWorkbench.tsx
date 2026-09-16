import { useState } from "react";
import { ArrowUpRight, Download, TrendingUp } from "lucide-react";
import {
  GROWTH_DEFAULTS,
  growthScenario,
  type GrowthInputs,
} from "@/interview/studio/growth";
import "./growth-workbench.css";

const labels: {
  key: keyof GrowthInputs;
  label: string;
  suffix: string;
  step: string;
}[] = [
  { key: "target", label: "Monthly revenue goal", suffix: "£", step: "1000" },
  {
    key: "price",
    label: "Revenue per paying learner / month",
    suffix: "£",
    step: "1",
  },
  {
    key: "minutes",
    label: "AI minutes per learner / month",
    suffix: "min",
    step: "5",
  },
  {
    key: "costPerMinute",
    label: "Blended AI cost / minute",
    suffix: "£",
    step: ".01",
  },
  {
    key: "feePercent",
    label: "Payment and other variable fees",
    suffix: "%",
    step: ".5",
  },
  { key: "fixedCosts", label: "Monthly fixed costs", suffix: "£", step: "100" },
  {
    key: "churnPercent",
    label: "Monthly paying learner churn",
    suffix: "%",
    step: "1",
  },
  {
    key: "conversionPercent",
    label: "Visitor-to-paying conversion",
    suffix: "%",
    step: ".1",
  },
];
const money = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
export default function GrowthWorkbench() {
  const [values, setValues] = useState<Record<keyof GrowthInputs, string>>(
    () =>
      Object.fromEntries(
        Object.entries(GROWTH_DEFAULTS).map(([k, v]) => [k, String(v)]),
      ) as Record<keyof GrowthInputs, string>,
  );
  const inputs = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      v.trim() === "" ? NaN : Number(v),
    ]),
  ) as unknown as GrowthInputs;
  const model = growthScenario(inputs);
  function exportModel() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              kind: "hypothetical-subscription-scenario",
              inputs,
              result: model,
              caveats: [
                "No connected revenue or traffic data",
                "Does not change checkout or billing",
                "Excludes taxes, refunds, acquisition costs and costs not entered above",
                "Seasonal demand and annual retention require validation",
              ],
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicine-growth-scenario.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="lab-section growth-workbench" id="growth-workbench">
      <div className="lab-section-title">
        <h2>Build the business behind the practice.</h2>
        <span>GROWTH WORKBENCH / ASSUMPTIONS</span>
      </div>
      <div className="growth-intro">
        <div>
          <TrendingUp size={23} />
          <p>
            A working model for the £100k monthly revenue ambition. Change the
            assumptions and see the customer count, delivery costs and retention
            burden together.
          </p>
        </div>
        <a href="/medicine/practice" target="_blank" rel="noreferrer">
          Open the student studio <ArrowUpRight size={16} />
        </a>
      </div>
      <p className="growth-disclosure">
        Hypothetical monthly subscription model. Medicine circuits currently
        cost zero credits during early access; the wider platform sells credits.
        This does not introduce a subscription or change checkout. No customer,
        traffic or revenue data is connected.
      </p>
      <div className="growth-grid">
        <div className="growth-inputs">
          {labels.map((f) => (
            <label key={f.key}>
              <span>{f.label}</span>
              <div>
                <b>{f.suffix}</b>
                <input
                  aria-label={f.label}
                  type="number"
                  min={f.key === "target" || f.key === "price" ? 0.01 : 0}
                  max={f.suffix === "%" ? 100 : undefined}
                  step={f.step}
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues((old) => ({ ...old, [f.key]: e.target.value }))
                  }
                />
              </div>
            </label>
          ))}
        </div>
        <div>
          {model ? (
            <>
              <div className="growth-main-result">
                <span>PAYING LEARNERS TO REACH THE GOAL</span>
                <strong>{model.subscribers.toLocaleString("en-GB")}</strong>
                <p>
                  at {money(inputs.price)} per month · {money(model.revenue)}{" "}
                  modelled revenue
                </p>
              </div>
              <div className="growth-results">
                <div>
                  <span>Delivery & variable fees / learner</span>
                  <b>{money(model.costPerCustomer)}</b>
                </div>
                <div>
                  <span>Contribution before fixed costs</span>
                  <b>{model.marginPercent.toFixed(1)}%</b>
                </div>
                <div>
                  <span>After entered fixed costs</span>
                  <b>{money(model.afterFixed)} / month</b>
                </div>
                <div>
                  <span>Paying learners to cover fixed costs</span>
                  <b>
                    {model.breakEvenCustomers?.toLocaleString("en-GB") ??
                      "Not reached at this margin"}
                  </b>
                </div>
                <div>
                  <span>New paying learners just to replace churn</span>
                  <b>{model.replacements.toLocaleString("en-GB")} / month</b>
                </div>
                <div>
                  <span>Visitors needed for those replacements</span>
                  <b>
                    {model.replacementVisitors?.toLocaleString("en-GB") ??
                      "Unreachable at 0% conversion"}
                    {model.replacementVisitors === null ? "" : " / month"}
                  </b>
                </div>
              </div>
              <p className="growth-disclosure">
                Contribution is revenue less the entered variable costs. This is
                not net profit: tax, refunds, acquisition spend and unentered
                costs remain outside the model. Churn replacement holds the goal
                steady; it does not model growth to it.
              </p>
              <button className="growth-export" onClick={exportModel}>
                <Download size={15} />
                Export this scenario
              </button>
            </>
          ) : (
            <p className="growth-disclosure" role="status">
              Enter a positive revenue goal and price. Other values must be
              non-negative; percentages must be between 0 and 100.
            </p>
          )}
        </div>
      </div>
      <div className="growth-experiments">
        <article>
          <span>ACTIVATION</span>
          <h3>First useful reflection</h3>
          <p>
            New visitors can try a prompt before signing up. Measure the share
            who start a studio question and save a meaningful next step.
          </p>
          <small>
            Built: public warm-up and practice studio. Measurement: event
            collection still to connect.
          </small>
        </article>
        <article>
          <span>RETENTION</span>
          <h3>A reason to return</h3>
          <p>
            Saved reflections, a due queue and a weekly routine make the next
            visit specific. Evaluate repeat practice over 7 and 30 days.
          </p>
          <small>
            Built: local plan, bookmarks and revisit schedule. Cross-device sync
            still to connect.
          </small>
        </article>
        <article>
          <span>CONVERSION</span>
          <h3>Move into a spoken circuit</h3>
          <p>
            Offer the live interview when a learner is ready to practise a
            conversation. Measure starts and completions now; test willingness
            to pay before introducing Medicine pricing.
          </p>
          <small>
            Built: studio-to-circuit path. Live end-to-end payment and AI
            validation still required.
          </small>
        </article>
      </div>
      <details className="growth-research">
        <summary>Research behind this build</summary>
        <p>
          Medify offers spoken or typed responses, a question bank and
          personalised feedback. Interviews Ninja emphasises peer practice. Our
          product choice is to make the first solo attempt useful immediately,
          then connect reflection to a revisit plan and live conversation.
        </p>
        <p>
          Retrieval research supports attempting before rereading. Applying it
          to interview routines is a design inference, not evidence that this
          product improves admission outcomes. The 1 / 3 / 7-day intervals are
          editorial defaults.
        </p>
        <div>
          <a
            href="https://medify.co/interviews"
            target="_blank"
            rel="noreferrer"
          >
            Medify product ↗
          </a>
          <a href="https://interviews.ninja/" target="_blank" rel="noreferrer">
            Interviews Ninja ↗
          </a>
          <a
            href="https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/"
            target="_blank"
            rel="noreferrer"
          >
            Retrieval study ↗
          </a>
        </div>
      </details>
    </section>
  );
}
