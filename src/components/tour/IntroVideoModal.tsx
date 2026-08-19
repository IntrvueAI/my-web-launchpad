import { Dialog, DialogContent } from '@/components/ui/dialog';

/** A full-bleed video modal — currently used for the founder send-off video shown at the end of
 *  onboarding (first-time users only, see TourOverlay). */
export function IntroVideoModal({
  open,
  onOpenChange,
  src,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
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
