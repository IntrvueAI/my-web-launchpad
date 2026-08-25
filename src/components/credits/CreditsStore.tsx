
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { OrderService } from "@/services/OrderService";

type Pack = 3 | 5 | 10;

// £5/credit baseline (3 credits = one Maths/Logic/Current Affairs mock at £15, 5 credits = one
// full 11+ interview at £25) with a 10% discount on the 10-credit pack.
const PACKS: { credits: Pack; priceCents: number; label: string; note?: string }[] = [
  { credits: 3, priceCents: 1500, label: "3 Credits", note: "One mock interview" },
  { credits: 5, priceCents: 2500, label: "5 Credits", note: "Most popular" },
  { credits: 10, priceCents: 4500, label: "10 Credits", note: "Best value" },
];

export const CreditsStore: React.FC = () => {
  const { toast } = useToast();
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
              <CardDescription>£5 per credit — cost varies by interview</CardDescription>
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
    </>
  );
};
