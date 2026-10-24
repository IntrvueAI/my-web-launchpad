import { TriangleAlert } from "lucide-react";
import { formatPence } from "@/config/medicinePricing";
import { PRODUCTS, splitSale, type CreatorLink, type ProgrammeCosts } from "@/lib/creatorProgramme";

/*
 * Part-to-whole per sale. Segment colours are the reference categorical palette, slots 1-4 in
 * order (validated for adjacent pairs; light steps, dark steps under .dark). Identity is never
 * colour alone: a legend, a tooltip and accessible label on every bar, and the table below.
 */
const SEGMENTS = [
  { key: "ourNet", label: "Our net", slot: 1 },
  { key: "creatorEarns", label: "Creator", slot: 2 },
  { key: "stripeFee", label: "Stripe fees", slot: 3 },
  { key: "delivery", label: "Interview delivery", slot: 4 },
] as const;
const VIZ_STYLE = `
.sale-viz{--series-1:#2a78d6;--series-2:#eb6834;--series-3:#1baf7a;--series-4:#eda100}
.dark .sale-viz{--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500}
`;

type Link = Pick<CreatorLink, "platform" | "discount_enabled" | "discount_percent" | "commission_type" | "commission_percent" | "commission_fixed_pence" | "commission_scope">;

/** What one purchase on this link pays out: customer price, creator, fees, delivery, our net, margin and markup. */
export function SaleBreakdown({ link, costs }: { link: Link; costs: ProgrammeCosts }) {
  const products = PRODUCTS.filter((p) => p.platform === link.platform);
  const rows = products.flatMap((product) => [true, false].map((first) => ({ product, first, split: splitSale(product, link, costs, first) })));
  const costsMissing = (link.platform === "medicine" ? costs.medicine_cost_per_credit_pence : costs.school_cost_per_credit_pence) === 0;
  return (
    <div className="sale-viz space-y-4">
      <style>{VIZ_STYLE}</style>
      {costsMissing && (
        <p className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2 text-xs">
          <TriangleAlert className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Interview delivery cost is £0.00 per credit. Set your Anam and OpenAI cost per credit under Overview → Cost assumptions.
        </p>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--series-${s.slot})` }} aria-hidden />{s.label}
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        {rows.filter((r) => r.first).map(({ product, split }) => {
          const total = split.customerPays || 1;
          const parts = SEGMENTS.map((s) => ({ ...s, value: Math.max(0, split[s.key]) }));
          return (
            <figure key={product.label} className="space-y-1">
              <figcaption className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium">{product.label} · first purchase</span>
                <span className="tabular-nums text-muted-foreground">customer pays {formatPence(split.customerPays)}</span>
              </figcaption>
              <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded bg-transparent" role="img"
                aria-label={parts.map((p) => `${p.label} ${formatPence(p.value)}`).join(", ")}>
                {parts.filter((p) => p.value > 0).map((p) => (
                  <div key={p.key} title={`${p.label}: ${formatPence(p.value)} (${Math.round((p.value / total) * 100)}%)`}
                    className="min-w-[3px] first:rounded-l last:rounded-r"
                    style={{ width: `${(p.value / total) * 100}%`, background: `var(--series-${p.slot})` }} />
                ))}
              </div>
              {split.ourNet < 0 && <p className="text-xs font-medium text-destructive">This sale loses {formatPence(-split.ourNet)} after costs.</p>}
            </figure>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Per-sale economics</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">Sale</th><th className="py-1 font-medium">List</th><th className="py-1 font-medium">Customer pays</th>
              <th className="py-1 font-medium">Creator</th><th className="py-1 font-medium">Stripe</th><th className="py-1 font-medium">Delivery</th>
              <th className="py-1 font-medium">Our net</th><th className="py-1 font-medium">Margin</th><th className="py-1 font-medium">Markup on cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, first, split }) => (
              <tr key={`${product.label}-${first}`} className="border-t tabular-nums">
                <td className="py-1.5">{product.label} <span className="text-muted-foreground">({first ? "first" : "later"})</span></td>
                <td className="py-1.5">{formatPence(split.listPrice)}</td>
                <td className="py-1.5">{formatPence(split.customerPays)}{split.discount ? <span className="text-muted-foreground"> (−{formatPence(split.discount)})</span> : null}</td>
                <td className="py-1.5 font-medium">{formatPence(split.creatorEarns)}</td>
                <td className="py-1.5">{formatPence(split.stripeFee)}</td>
                <td className="py-1.5">{formatPence(split.delivery)}</td>
                <td className={`py-1.5 font-medium ${split.ourNet < 0 ? "text-destructive" : ""}`}>{formatPence(split.ourNet)}</td>
                <td className="py-1.5">{split.marginPercent}%</td>
                <td className="py-1.5">{split.markupPercent === null ? "–" : `${split.markupPercent}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimates from your cost assumptions, before VAT and refunds. Creator share is on what the customer actually paid. Markup on cost = our net ÷ (creator + Stripe + delivery).
      </p>
    </div>
  );
}
