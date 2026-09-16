export interface GrowthInputs {
  target: number;
  price: number;
  minutes: number;
  costPerMinute: number;
  feePercent: number;
  fixedCosts: number;
  churnPercent: number;
  conversionPercent: number;
}
export const GROWTH_DEFAULTS: GrowthInputs = {
  target: 100000,
  price: 49,
  minutes: 60,
  costPerMinute: 0.08,
  feePercent: 4,
  fixedCosts: 2000,
  churnPercent: 8,
  conversionPercent: 2,
};
/** Scenario arithmetic only. Inputs are assumptions, not observed metrics or a checkout price. */
export function growthScenario(input: GrowthInputs) {
  if (
    Object.values(input).some((n) => !Number.isFinite(n) || n < 0) ||
    input.price <= 0 ||
    input.target <= 0 ||
    input.churnPercent > 100 ||
    input.conversionPercent > 100 ||
    input.feePercent > 100
  )
    return null;
  const subscribers = Math.ceil(input.target / input.price);
  const revenue = subscribers * input.price;
  const costPerCustomer =
    input.minutes * input.costPerMinute +
    (input.price * input.feePercent) / 100;
  const contributionPerCustomer = input.price - costPerCustomer;
  const contribution = subscribers * contributionPerCustomer;
  const replacements = Math.ceil((subscribers * input.churnPercent) / 100);
  const result = {
    subscribers,
    revenue,
    costPerCustomer,
    contributionPerCustomer,
    contribution,
    afterFixed: contribution - input.fixedCosts,
    marginPercent: (contributionPerCustomer / input.price) * 100,
    replacements,
    replacementVisitors:
      replacements === 0
        ? 0
        : input.conversionPercent > 0
          ? Math.ceil(replacements / (input.conversionPercent / 100))
          : null,
    breakEvenCustomers:
      contributionPerCustomer > 0
        ? Math.ceil(input.fixedCosts / contributionPerCustomer)
        : null,
  };
  return Object.values(result).some(
    (value) => typeof value === "number" && !Number.isFinite(value),
  )
    ? null
    : result;
}
