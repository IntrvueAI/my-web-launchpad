import { useState } from 'react';
import { MedicineContent } from '@/components/marketing/MedicineContent';
import { MedicineLandingCoralPreview } from '@/components/marketing/MedicineLandingCoralPreview';

type LandingVariant = 'coral' | 'classic';
const STORAGE_KEY = 'intrvue_medicine_landing_variant';

const getStoredVariant = (): LandingVariant =>
  localStorage.getItem(STORAGE_KEY) === 'classic' ? 'classic' : 'coral';

/**
 * Public Medicine interview practice page — reachable from the landing page nav and About Us.
 * Two full designs live here (coral/white — the current direction, matching the logged-in Medicine
 * dashboard — and the original dark "classic" page); a floating toggle lets visitors compare them.
 * Both funnel into the same real signup flow (/auth?mode=medicine), so the toggle only changes
 * marketing presentation, never the product behind it.
 */
export default function Medicine() {
  const [variant, setVariant] = useState<LandingVariant>(getStoredVariant);

  const toggleVariant = () => {
    const next: LandingVariant = variant === 'coral' ? 'classic' : 'coral';
    localStorage.setItem(STORAGE_KEY, next);
    setVariant(next);
  };

  return (
    <div className="animate-in fade-in duration-300">
      {variant === 'coral' ? <MedicineLandingCoralPreview /> : <MedicineContent />}
      <button
        onClick={toggleVariant}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 200,
          background: '#1C2029',
          color: '#fff',
          border: 0,
          borderRadius: 999,
          padding: '11px 20px',
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: "'Inter Tight', system-ui, -apple-system, sans-serif",
          cursor: 'pointer',
          boxShadow: '0 10px 30px -8px rgba(0,0,0,.45)',
        }}
      >
        {variant === 'coral' ? 'View classic design →' : 'View coral design →'}
      </button>
    </div>
  );
}
