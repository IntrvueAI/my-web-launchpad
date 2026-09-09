import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Same self-contained-HTML pattern as MedicineContent.tsx — this is a restyled preview of that
// page using the site's original white/coral palette (see src/assets/medicine-landing-coral.html),
// not a replacement for the live dark version yet.
import rawHtml from '@/assets/medicine-landing-coral.html?raw';
import { SchoolMatcher } from './SchoolMatcher';
// Same real Clara photo used on the live 11+ landing page hero (src/components/landing/LandingV2.tsx)
// — Clara is the interviewer for Medicine too (see src/interview/subjects/medicine/pack.ts), so this
// isn't a placeholder swap, it's the same persona shown in the same "live call" mock.
import claraHeroShot from '@/assets/landing-hero-shot.png';

const styleCss = rawHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const scriptJs = rawHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const bodyHtml = (rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? rawHtml)
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace('%%MEDICINE_HERO_SHOT%%', claraHeroShot);

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap';

export function MedicineLandingCoralPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [matcherMount, setMatcherMount] = useState<Element | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.textContent = scriptJs;
    document.body.appendChild(script);

    setMatcherMount(ref.current?.querySelector('#medicine-school-matcher-root') ?? null);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleCss }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      {matcherMount && createPortal(<SchoolMatcher theme="light" />, matcherMount)}
    </>
  );
}
