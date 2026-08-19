import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pip } from '@/components/brand/Pip';

/** Text-only send-off shown once onboarding is fully done — after the guided tour and, if
 *  available, the founder video (see IntroVideoModal / TourOverlay). */
export function WelcomeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <Pip size={64} float />
          <div>
            <h2 className="text-xl font-bold mb-1">Welcome to intrvue.ai!</h2>
            <p className="text-sm text-muted-foreground">
              You're all set — let's get you into your first interview.
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            Let's go
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
