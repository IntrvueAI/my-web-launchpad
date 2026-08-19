import { AboutUsContent } from '@/components/marketing/AboutUsContent';

/** Public "About us" page — reachable from the landing page footer. */
export default function AboutUs() {
  return (
    <div className="animate-in fade-in duration-300">
      <AboutUsContent />
    </div>
  );
}
