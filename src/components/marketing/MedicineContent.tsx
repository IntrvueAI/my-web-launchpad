import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Rendered the same way as the other marketing pages (About/FAQ/Landing): authored as self-contained
// HTML, injected verbatim so it stays 1:1 with the design, with its own fonts + inline script re-run.
// ONE exception: the school-matcher section needs to be genuinely interactive (search, live results),
// which raw HTML can't give us — see medicine.html's `#medicine-school-matcher-root` div, portaled to
// below once the static markup has mounted.
import rawHtml from '@/assets/medicine.html?raw';
import { SchoolMatcher } from './SchoolMatcher';

const styleCss = rawHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const scriptJs = rawHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const bodyHtml = (rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? rawHtml)
  .replace(/<script>[\s\S]*?<\/script>/g, '');

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap';

export function MedicineContent() {
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
      {matcherMount && createPortal(<SchoolMatcher />, matcherMount)}
    </>
  );
}
