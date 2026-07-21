import { Dialog, DialogContent } from '@/components/ui/dialog';

/** The product-demo video, reused as the "how it works" payoff at the end of the first-time tour. */
export function HowItWorksModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-white/10">
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="w-full aspect-video block"
          src="/lovable-uploads/DemoVideoV2.mp4"
        >
          Your browser does not support the video tag.
        </video>
      </DialogContent>
    </Dialog>
  );
}
