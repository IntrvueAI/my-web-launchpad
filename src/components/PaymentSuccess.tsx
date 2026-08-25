
import React from "react";
import Confetti from "react-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentSuccessProps {
  onGoToPractice: () => void;
  onGoToCredits: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onGoToPractice, onGoToCredits }) => {
  const { toast } = useToast();
  const [processing, setProcessing] = React.useState(true);
  const [result, setResult] = React.useState<{ balance?: number; added?: number } | null>(null);
  const [width, setWidth] = React.useState<number>(window.innerWidth);
  const [height, setHeight] = React.useState<number>(window.innerHeight);

  React.useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setProcessing(false);
      toast({
        title: "Missing session",
        description: "No payment session was provided.",
        variant: "destructive",
      });
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;

        setResult({ balance: data?.balance, added: data?.credits_added });
        toast({
          title: "Payment successful",
          description: `Your credits have been updated.`,
        });
      } catch (caught) {
        const e = caught instanceof Error ? caught : new Error(String(caught));
        console.error("verify-payment error", e);
        toast({
          title: "Verification failed",
          description: e.message || "Please contact support.",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    };

    verify();
  }, [toast]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center relative overflow-hidden">
      {!processing && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Payment Successful 🎉</CardTitle>
          <CardDescription>Your purchase is complete and your credits are ready to use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {processing ? (
            <p className="text-muted-foreground">Verifying your payment...</p>
          ) : (
            <>
              <div className="text-sm">
                {typeof result?.added === "number" && (
                  <p>
                    Credits added: <span className="font-semibold">{result.added}</span>
                  </p>
                )}
                {typeof result?.balance === "number" && (
                  <p>
                    New balance: <span className="font-semibold">{result.balance}</span> credits
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={onGoToPractice}>Go to Practice</Button>
                <Button variant="outline" onClick={onGoToCredits}>
                  Buy more credits
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
