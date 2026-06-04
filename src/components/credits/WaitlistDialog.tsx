import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown when a user tries to buy credits while purchases are paused.
 * Captures their email as an expression of interest in the
 * `payment_waitlist` table. No payment is taken.
 */
export const WaitlistDialog: React.FC<WaitlistDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  // Prefill with the signed-in user's email when the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Enter a valid email",
        description: "Please double-check your email address.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      // `payment_waitlist` isn't in the generated types until the migration is
      // applied and types are regenerated; cast to insert in the meantime.
      const { error } = await (supabase as any).from("payment_waitlist").insert({
        user_id: userData.user?.id ?? null,
        email: trimmed,
        source: "credits_page",
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error("Waitlist signup failed:", err);
      toast({
        title: "Something went wrong",
        description: "We couldn't add you to the waitlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // reset after close so it's fresh next time
      setTimeout(() => setDone(false), 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <DialogTitle>You're on the list!</DialogTitle>
            <DialogDescription>
              Thanks for your interest. We'll email you as soon as credits are
              available to purchase.
            </DialogDescription>
            <Button className="mt-2 w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Purchases are paused</DialogTitle>
              <DialogDescription>
                We're putting the finishing touches on Intrvue.AI and aren't
                taking payments just yet. Leave your email and we'll let you know
                the moment credits go on sale.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                id="waitlist-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Adding you…" : "Join the waitlist"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
