
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { OrderService } from "@/services/OrderService";
import { useMedicineCredits } from "@/hooks/useMedicineCredits";
import { useReferralOffer } from "@/hooks/useReferralOffer";
import {
  MEDICINE_CREDIT_PACKS, formatPence, medicineCreditsLabel, type MedicineCreditPackId,
} from "@/config/medicinePricing";

type Pack = 2 | 3 | 5;

// 2 credits = one Maths/Logic/Current Affairs mock (£19.99), 3 credits = one full 11+ interview
// (£29.99), 5 credits = one of each bundled with a small discount (£19.99 + £29.99 = £49.98 apart).
const PACKS: { credits: Pack; priceCents: number; label: string; note?: string }[] = [
  { credits: 2, priceCents: 1999, label: "2 Credits", note: "One topic mock" },
  { credits: 3, priceCents: 2999, label: "3 Credits", note: "One full 11+ interview" },
  { credits: 5, priceCents: 4499, label: "5 Credits", note: "Best value — one of each" },
];

/** 11+ and Medicine (MMI Practice) credits are separate balances with their own packs. */
export const CreditsStore: React.FC<{ platform?: "11plus" | "medicine" }> = ({ platform = "11plus" }) =>
  platform === "medicine" ? <MedicineCreditsStore /> : <SchoolCreditsStore />;

const MEDICINE_OFFERS: { id: MedicineCreditPackId; title: string; detail: string; badge?: string }[] = [
  {
    id: "single",
    title: "Mini interview",
    detail: "One seven-minute station: Communication & empathy, Motivation & reflection, or Data & prioritisation.",
  },
  {
    id: "full",
    title: "Full MMI",
    detail: `One full six-station MMI, or six mini interviews at ${formatPence(Math.round(MEDICINE_CREDIT_PACKS.full.amountPence / MEDICINE_CREDIT_PACKS.full.credits))} each.`,
    badge: "Best value",
  },
];

/** Shown to referred customers before their first purchase; the server applies the discount. */
const OfferBanner: React.FC<{ offer: { creator: string; discountPercent: number } | null }> = ({ offer }) =>
  offer ? (
    <p role="status" className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
      <strong>{offer.discountPercent}% off your first purchase</strong> from {offer.creator}'s link, applied automatically at checkout.
    </p>
  ) : null;
const discounted = (pence: number, offer: { discountPercent: number } | null) =>
  offer ? pence - Math.round((pence * offer.discountPercent) / 100) : pence;
const Price: React.FC<{ pence: number; offer: { discountPercent: number } | null }> = ({ pence, offer }) => (
  <div className="text-3xl font-bold">
    {offer && <span className="mr-2 text-lg font-medium text-muted-foreground line-through">{formatPence(pence)}</span>}
    {formatPence(discounted(pence, offer))}
    <span className="ml-1 text-sm text-muted-foreground">GBP</span>
  </div>
);

const MedicineCreditsStore: React.FC = () => {
  const { toast } = useToast();
  const { credits, isLoading } = useMedicineCredits();
  const offer = useReferralOffer("medicine");
  const [loadingPack, setLoadingPack] = React.useState<MedicineCreditPackId | null>(null);
  const buy = async (pack: MedicineCreditPackId) => {
    try {
      setLoadingPack(pack);
      const { checkoutUrl } = await OrderService.createMedicineOrder(pack);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Checkout failed:", err);
      toast({ title: "Checkout unavailable", description: "We couldn't start checkout. Please try again shortly.", variant: "destructive" });
      setLoadingPack(null);
    }
  };
  return (
    <section aria-labelledby="medicine-credits-title" className="space-y-6">
      <div>
        <h2 id="medicine-credits-title" className="font-display text-2xl font-semibold">MMI Practice credits</h2>
        <p className="mt-1 text-muted-foreground">
          {isLoading ? "Checking your balance…" : <>You have <strong className="text-foreground">{medicineCreditsLabel(credits)}</strong>.</>}{" "}
          Medicine credits are separate from 11+ credits.
        </p>
      </div>
      <OfferBanner offer={offer} />
      <div className="grid gap-5 sm:grid-cols-2">
        {MEDICINE_OFFERS.map((item) => {
          const pack = MEDICINE_CREDIT_PACKS[item.id];
          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  {item.badge && <Badge>{item.badge}</Badge>}
                </div>
                <CardDescription>{medicineCreditsLabel(pack.credits)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <Price pence={pack.amountPence} offer={offer} />
                <p className="flex-1 text-sm text-muted-foreground">{item.detail}</p>
                <Button className="w-full" onClick={() => void buy(item.id)} disabled={loadingPack !== null}>
                  {loadingPack === item.id ? "Redirecting…" : `Buy ${medicineCreditsLabel(pack.credits).replace("Medicine ", "")}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li><strong className="text-foreground">Ethics & judgement is free</strong>, with no credits needed.</li>
        <li>Credits are used when the interview connects. If it cannot start, they are returned automatically.</li>
        <li>Secure checkout via Stripe.</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Cost a barrier? We offer a pay-what-you-can option. Just{" "}
        <a href="mailto:founders@intrvue.ai" className="underline underline-offset-2 hover:text-foreground">email us</a>.
      </p>
    </section>
  );
};

const SchoolCreditsStore: React.FC = () => {
  const { toast } = useToast();
  const offer = useReferralOffer("11plus");
  const [loadingPack, setLoadingPack] = React.useState<Pack | null>(null);

  const handleBuy = async (pack: Pack) => {
    try {
      setLoadingPack(pack);
      const { checkoutUrl } = await OrderService.createOrder(pack);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Checkout failed:", err);
      toast({
        title: "Checkout unavailable",
        description: "We couldn't start checkout. Please try again shortly.",
        variant: "destructive",
      });
      setLoadingPack(null);
    }
  };

  return (
    <>
      <div className="mb-6"><OfferBanner offer={offer} /></div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((p) => (
          <Card key={p.credits} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{p.label}</CardTitle>
                {p.note && (
                  <Badge variant="outline" className="text-xs">
                    {p.note}
                  </Badge>
                )}
              </div>
              <CardDescription>Cost varies by interview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Price pence={p.priceCents} offer={offer} />
              <Button
                className="w-full"
                onClick={() => handleBuy(p.credits)}
                disabled={loadingPack !== null}
              >
                {loadingPack === p.credits
                  ? "Redirecting…"
                  : `Buy ${p.credits} credit${p.credits > 1 ? "s" : ""}`}
              </Button>
              <p className="text-xs text-muted-foreground">
                Secure checkout via Stripe. You’ll be redirected to complete your purchase.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Cost a barrier? We offer a pay-what-you-can option — just{" "}
        <a href="mailto:founders@intrvue.ai" className="underline underline-offset-2 hover:text-foreground">
          email us
        </a>{" "}
        and we'll sort something out, no forms needed.
      </p>
    </>
  );
};
