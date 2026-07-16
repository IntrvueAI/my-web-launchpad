/**
 * Pip — the intrvue owl mascot, as drawn in design-reference/Intrvue Bright Deck.html.
 * One friendly SVG used everywhere; `size` is the width in px, `float` adds the gentle bob.
 *
 * Pip can wear a hat! The equipped hat comes from PipCustomizationContext (set in the Locker
 * Room), so every Pip on the site changes at once. Pass `hat` explicitly to override — the
 * locker room uses that for previews.
 */
import { cn } from '@/lib/utils';
import { usePipCustomization, type HatId } from '@/contexts/PipCustomizationContext';

/** The hat layer, drawn in Pip's 120-wide coordinate space (head dome tops out at y≈16). */
function PipHat({ hat }: { hat: HatId }) {
  switch (hat) {
    case 'beta-cap': // coral baseball cap with the intrvue owl logo
      return (
        <g>
          <path d="M30 24 Q30 2 60 2 Q90 2 90 24 Z" fill="#FF7F50" />
          <rect x="24" y="21" width="72" height="7" rx="3.5" fill="#F1730B" />
          <circle cx="60" cy="3" r="2.6" fill="#F1730B" />
          {/* the intrvue.ai logo: white rounded tile, owl eyes + beak */}
          <rect x="51" y="8" width="18" height="13" rx="5.5" fill="#fff" />
          <circle cx="56.4" cy="13.5" r="2.3" fill="#0B1121" />
          <circle cx="63.6" cy="13.5" r="2.3" fill="#0B1121" />
          <polygon points="58.4,17 60,18.8 61.6,17" fill="#FF8A4B" />
        </g>
      );
    case 'party': // stripy celebration cone + pom
      return (
        <g>
          <polygon points="60,-4 44,26 76,26" fill="#38BDF8" />
          <polygon points="51.5,12 68.5,12 71.5,18 48.5,18" fill="#FBBF24" />
          <polygon points="56,3.5 64,3.5 66.5,8.5 53.5,8.5" fill="#F43F5E" />
          <circle cx="60" cy="-5" r="4.6" fill="#F43F5E" />
        </g>
      );
    case 'beanie': // cosy rose beanie with a cream pom
      return (
        <g>
          <path d="M30 26 Q30 0 60 0 Q90 0 90 26 Z" fill="#F43F5E" />
          <rect x="28" y="19" width="64" height="8.5" rx="4.25" fill="#BE123C" />
          <circle cx="60" cy="0" r="5.2" fill="#EDE6D8" />
        </g>
      );
    case 'grad': // mortarboard + amber tassel
      return (
        <g>
          <path d="M44 16 Q44 30 60 30 Q76 30 76 16 Z" fill="#1E2740" />
          <polygon points="60,-6 98,10 60,26 22,10" fill="#232D45" />
          <polygon points="60,-2.5 90,10 60,22.5 30,10" fill="#1E2740" />
          <path d="M60 10 L86 13 L86 23" stroke="#FBBF24" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="86" cy="25.5" r="3" fill="#F59E0B" />
          <circle cx="60" cy="10" r="2.2" fill="#FBBF24" />
        </g>
      );
    case 'wizard': // starry purple wizard hat
      return (
        <g>
          <polygon points="60,-8 42,24 78,24" fill="#8B5CF6" />
          <ellipse cx="60" cy="24.5" rx="26" ry="5" fill="#7C3AED" />
          <polygon points="60,0 61.6,4.4 66,4.4 62.4,7.2 63.8,11.5 60,9 56.2,11.5 57.6,7.2 54,4.4 58.4,4.4" fill="#FDE68A" />
          <circle cx="53" cy="15" r="1.6" fill="#fff" opacity="0.9" />
          <circle cx="66" cy="18" r="1.3" fill="#fff" opacity="0.8" />
        </g>
      );
    case 'crown': // golden crown with gems
      return (
        <g>
          <path d="M38 25 L38 8 L48 17 L60 2 L72 17 L82 8 L82 25 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="48" cy="20.5" r="2.1" fill="#F43F5E" />
          <circle cx="60" cy="19" r="2.4" fill="#38BDF8" />
          <circle cx="72" cy="20.5" r="2.1" fill="#34D399" />
        </g>
      );
    default:
      return null;
  }
}

export function Pip({
  size = 96,
  float = false,
  className,
  hat,
}: {
  size?: number;
  float?: boolean;
  className?: string;
  /** Override the equipped hat (locker room previews); omit to wear what the user equipped. */
  hat?: HatId;
}) {
  const { hat: equipped } = usePipCustomization();
  const worn = hat ?? equipped;
  return (
    <svg
      viewBox="0 -14 120 148"
      width={size}
      height={(size * 148) / 120}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(float && 'pip-float', className)}
      aria-hidden="true"
    >
      <rect x="14" y="16" width="92" height="104" rx="46" ry="46" fill="#232D45" />
      <polygon points="16,28 34,14 26,38" fill="#232D45" />
      <polygon points="104,28 86,14 94,38" fill="#232D45" />
      <path d="M30,90 C30,112 44,122 60,122 C76,122 90,112 90,90 C90,80 76,74 60,74 C44,74 30,80 30,90 Z" fill="#EDE6D8" />
      <circle cx="44" cy="62" r="18" fill="#fff" />
      <circle cx="76" cy="62" r="18" fill="#fff" />
      <circle cx="44" cy="64" r="9.5" fill="#1E2740" />
      <circle cx="76" cy="64" r="9.5" fill="#1E2740" />
      <circle cx="47" cy="61" r="2.6" fill="#fff" />
      <circle cx="79" cy="61" r="2.6" fill="#fff" />
      <polygon points="60,76 68,84 60,92 52,84" fill="#FF7A45" />
      <PipHat hat={worn} />
    </svg>
  );
}

/** Compact alias — the same owl at a small default size, for logos/inline use. */
export function PipMark({ size = 30, className }: { size?: number; className?: string }) {
  return <Pip size={size} className={className} />;
}
