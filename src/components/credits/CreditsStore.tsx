
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { OrderService } from "@/services/OrderService";
import { WaitlistDialog } from "@/components/credits/WaitlistDialog";

type Pack = 1 | 5 | 10;

// Master switch for purchases. While false, the buy buttons open the waitlist
// instead of starting a Stripe checkout. Flip VITE_PAYMENTS_ENABLED to 'true'
// (and redeploy the frontend) to re-enable real payments. Stripe stays wired.
const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === "true";

const PACKS: { credits: Pack; priceCents: number; label: string; note?: string }[] = [
  { credits: 1, priceCents: 999, label: "1 Credit", note: "Great for a quick try" },
  { credits: 5, priceCents: 4499, label: "5 Credits", note: "Most popular" },
  { credits: 10, priceCents: 6999, label: "10 Credits", note: "Best value" },
];

export const CreditsStore: React.FC = () => {
  const { toast } = useToast();
  const [loadingPack, setLoadingPack] = React.useState<Pack | null>(null);
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);

  const handleBuy = async (pack: Pack) => {
    // Purchases paused: route to the waitlist instead of Stripe.
    if (!PAYMENTS_ENABLED) {
      setWaitlistOpen(true);
      return;
    }

    // Payments enabled: start a real Stripe checkout.
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
              <CardDescription>Each credit = 1 interview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                £{(p.priceCents / 100).toFixed(2)}
                <span className="text-muted-foreground text-sm ml-1">GBP</span>
              </div>
              <Button
                className="w-full"
                onClick={() => handleBuy(p.credits)}
                disabled={loadingPack !== null}
              >
                {!PAYMENTS_ENABLED
                  ? "Join the waitlist"
                  : loadingPack === p.credits
                  ? "Redirecting…"
                  : `Buy ${p.credits} credit${p.credits > 1 ? "s" : ""}`}
              </Button>
              <p className="text-xs text-muted-foreground">
                {!PAYMENTS_ENABLED
                  ? "Purchases are paused while we finish building. Join the waitlist to be notified."
                  : "Secure checkout via Stripe. You’ll be redirected to complete your purchase."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </>
  );
};
