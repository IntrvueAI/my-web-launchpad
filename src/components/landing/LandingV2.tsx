import { useEffect, useRef } from 'react';
// The marketing landing is authored as a self-contained HTML page (design-reference/index.html,
// copied to src/assets). We render it verbatim so it stays 1:1 with the design, inject its styles +
// fonts, re-run its little vanilla script (scripts inside dangerouslySetInnerHTML don't execute),
// and wire its "Try free demo / Get started / Sign in" CTAs into the app's auth flow.
import rawHtml from '@/assets/landing.html?raw';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const styleCss = rawHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const scriptJs = rawHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const bodyHtml = (rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? rawHtml)
  .replace(/<script>[\s\S]*?<\/script>/g, '');

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap';

export function LandingV2({ onSignUp }: { onSignUp: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);

    // Re-run the page's own script (nav shadow, mobile menu, waitlist success, tabs, scroll-reveal).
    const script = document.createElement('script');
    script.textContent = scriptJs;
    document.body.appendChild(script);

    // Route the app-facing CTAs (demo / get started / sign in) into /auth.
    const root = ref.current;
    const goAuth = (e: Event) => { e.preventDefault(); onSignUp(); };
    const wired: Element[] = [];
    root?.querySelectorAll('a, button').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (/try free demo|get started|sign in|start free|start your|try it free|log in/.test(t)) {
        el.addEventListener('click', goAuth);
        wired.push(el);
      }
    });

    // Actually store the "Join waitlist" email (the page's own script only handles the visual
    // hide-form/show-success toggle — it never persisted anything). Runs alongside that script
    // rather than replacing it: we don't preventDefault or touch the DOM here, just fire the
    // insert. Silently ignore a duplicate-email submit (unique index) — the user's already on it.
    const waitlistCleanups: Array<() => void> = [];
    [{ formId: 'waitlistForm', inputId: 'wlEmail' }, { formId: 'waitlistForm2', inputId: 'wlEmail2' }]
      .forEach(({ formId, inputId }) => {
        const form = root?.querySelector<HTMLFormElement>(`#${formId}`);
        const input = root?.querySelector<HTMLInputElement>(`#${inputId}`);
        if (!form || !input) return;
        const onSubmit = () => {
          const email = input.value.trim();
          if (!email || !/.+@.+\..+/.test(email)) return;
          supabase.from('marketing_waitlist').insert({ email, source: 'landing_page' }).then(({ error }) => {
            if (error && error.code !== '23505') {
              // Not a duplicate-email conflict — a genuine failure. The static page's own script still
              // shows its "you're on the list!" success state regardless (it isn't aware this insert
              // exists at all), so without this the visitor would be told they're signed up when they
              // are not. A toast is the least invasive way to surface the real failure on top of that
              // decoupled static UI without having to reverse-engineer its own success/error toggle.
              console.error('Failed to save waitlist email:', error.message);
              toast({
                title: "Something went wrong",
                description: "We couldn't save your email just now — please try again, or email us directly.",
                variant: 'destructive',
              });
            }
          });
        };
        form.addEventListener('submit', onSubmit);
        waitlistCleanups.push(() => form.removeEventListener('submit', onSubmit));
      });

    return () => {
      link.remove();
      script.remove();
      wired.forEach((el) => el.removeEventListener('click', goAuth));
      waitlistCleanups.forEach((fn) => fn());
    };
  }, [onSignUp]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleCss }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
