import { Dialog, DialogContent } from '@/components/ui/dialog';

/** A full-bleed video modal, shown as one of the onboarding steps (first-time users only).
 *  Generalized from the original hardcoded onboarding-walkthrough-only modal so the same component
 *  serves both the founder video and the product walkthrough. */
export function IntroVideoModal({
  open,
  onOpenChange,
  src = '/lovable-uploads/OnboardingWalkthrough.mp4',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-white/10">
        <video
          key={src}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="w-full aspect-video block"
          src={src}
        >
          Your browser does not support the video tag.
        </video>
      </DialogContent>
    </Dialog>
  );
}
