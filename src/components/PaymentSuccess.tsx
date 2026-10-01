
import React from "react";
import Confetti from "react-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

interface PaymentSuccessProps {
  onGoToPractice: () => void;
  onGoToCredits: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onGoToPractice, onGoToCredits }) => {
  const { toast } = useToast();
  const [processing, setProcessing] = React.useState(true);
  const [result, setResult] = React.useState<{ balance?: number; added?: number } | null>(null);
  const [verificationError, setVerificationError] = React.useState('');
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

  const verify = React.useCallback(async () => {
    setProcessing(true);
    setVerificationError('');
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setProcessing(false);
      setVerificationError('No payment reference was provided. Open your payment confirmation link or check your credits.');
      toast({
        title: "Missing session",
        description: "No payment session was provided.",
        variant: "destructive",
      });
      return;
    }

      try {
        const { data, error } = await invokeEdgeFunction<{ balance: number; credits_added: number }>("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if (!data || !Number.isFinite(data.balance) || !Number.isFinite(data.credits_added)) throw new Error('The payment service returned no confirmed balance.');

        setResult({ balance: data?.balance, added: data?.credits_added });
        toast({
          title: "Payment successful",
          description: `Your credits have been updated.`,
        });
      } catch (caught) {
        const e = caught instanceof Error ? caught : new Error(String(caught));
        setVerificationError('We could not confirm this payment yet. Retry the check or contact founders@intrvue.ai with your payment reference.');
        console.error("verify-payment error", e);
        toast({
          title: "Verification failed",
          description: e.message || "Please contact support.",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
  }, [toast]);
  React.useEffect(() => { void verify(); }, [verify]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center relative overflow-hidden">
      {!processing && result && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{processing ? 'Checking your payment' : result ? 'Payment successful' : 'Payment not yet confirmed'}</CardTitle>
          <CardDescription>{result ? 'Your purchase is confirmed and your credits are ready to use.' : 'We will confirm your purchase with the payment service before showing your updated balance.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {processing ? (
            <p className="text-muted-foreground">Verifying your payment...</p>
          ) : (
            <>
              {verificationError && <div role="alert" className="space-y-3"><p className="text-sm">{verificationError}</p><Button variant="outline" onClick={() => void verify()}>Retry payment check</Button></div>}
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
                  View my credits
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
