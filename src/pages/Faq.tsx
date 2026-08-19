import { FaqContent } from '@/components/marketing/FaqContent';

/** Public FAQ page — reachable from the landing page footer and the in-app help link. */
export default function Faq() {
  return (
    <div className="animate-in fade-in duration-300">
      <FaqContent />
    </div>
  );
}
