import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isMedicineSite } from "@/lib/site";

const HOME_TITLE = {
  medicine: "MMI Practice | Medicine interview preparation",
  school: "Intrvue AI - 11+ Interview Preparation",
};
const BRAND = { medicine: "MMI Practice", school: "intrvue.ai" };

const PAGES: [RegExp, string][] = [
  [/^\/auth\/?$/, "Sign in"],
  [/^\/reset-password\/?$/, "Set your password"],
  [/^\/about\/?$/, "About"],
  [/^\/faq\/?$/, "FAQ"],
  [/^\/(medicine\/)?examples\/?$/, "Example answers"],
  [/^\/medicine\/practice\/?$/, "Solo practice studio"],
  [/^\/medicine\/move\/?$/, "Moving to MMI Practice"],
  [/^\/schools(\/|$)/, "For schools"],
  [/^\/(classes|join-class)(\/|$)/, "Join your class"],
  [/^\/(try|guest-session|guest-feedback)\/?$|^\/(medicine|11plus)\/[A-Za-z0-9_-]{22}$/, "Your practice invitation"],
  [/^\/admin(\/|$)/, "Admin"],
  [/^\/creator\/?$/, "Creator dashboard"],
  [/^\/r\/[a-z0-9-]+\/?$/i, "You're invited"],
];

/** The browser-tab title for a path: the page name, then the site's brand. */
export function pageTitleFor(pathname: string, medicine: boolean): string {
  const site = medicine ? "medicine" : "school";
  const page = PAGES.find(([pattern]) => pattern.test(pathname))?.[1];
  return page ? `${page} · ${BRAND[site]}` : HOME_TITLE[site];
}

export const notFoundTitle = () => `Page not found · ${BRAND[isMedicineSite() ? "medicine" : "school"]}`;

/** Keeps document.title in step with the current route. */
export function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pageTitleFor(pathname, isMedicineSite());
  }, [pathname]);
  return null;
}
