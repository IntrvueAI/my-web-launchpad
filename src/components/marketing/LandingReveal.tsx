import { useEffect, useRef, type ReactNode } from "react";
import { MEDICINE_FONTS_HREF } from "@/components/medicine-dashboard/MedicineTheme";

/**
 * Adds `is-in` to the element once it scrolls into view. Each design styles `.lr-reveal` itself;
 * without IntersectionObserver the content is shown immediately.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  ...rest
}: {
  children: ReactNode;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`lr-reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Loads the Medicine identity fonts plus any extra Google Fonts family a design needs. */
export function useLandingFonts(extraHref?: string) {
  useEffect(() => {
    const add = (id: string, href: string) => {
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };
    add("medicine-identity-fonts", MEDICINE_FONTS_HREF);
    if (extraHref) add(`landing-font-${extraHref.length}`, extraHref);
  }, [extraHref]);
}
