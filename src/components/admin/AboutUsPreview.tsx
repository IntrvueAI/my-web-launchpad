import { useEffect, useRef } from 'react';
// Draft "About us" page, adapted from design-reference/About Us.dc.html. Rendered the same way as
// the marketing landing page (LandingV2): authored as self-contained HTML, injected verbatim so it
// stays 1:1 with the design, with its own fonts + inline script re-run. TEMP admin-only preview —
// not linked from anywhere public. Founder photos aren't ready yet, marked TBC directly on the page.
import rawHtml from '@/assets/about-us.html?raw';

const styleCss = rawHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const scriptJs = rawHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const bodyHtml = (rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? rawHtml)
  .replace(/<script>[\s\S]*?<\/script>/g, '');

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap';

export function AboutUsPreview() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.textContent = scriptJs;
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleCss }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
