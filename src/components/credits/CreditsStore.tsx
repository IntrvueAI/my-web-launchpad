
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { OrderService } from "@/services/OrderService";

type Pack = 2 | 3 | 5;

// 2 credits = one Maths/Logic/Current Affairs mock (£19.99), 3 credits = one full 11+ interview
// (£29.99), 5 credits = one of each bundled with a small discount (£19.99 + £29.99 = £49.98 apart).
const PACKS: { credits: Pack; priceCents: number; label: string; note?: string }[] = [
  { credits: 2, priceCents: 1999, label: "2 Credits", note: "One topic mock" },
  { credits: 3, priceCents: 2999, label: "3 Credits", note: "One full 11+ interview" },
  { credits: 5, priceCents: 4499, label: "5 Credits", note: "Best value — one of each" },
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
              <CardDescription>Cost varies by interview</CardDescription>
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
