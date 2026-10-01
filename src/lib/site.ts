// One release, two product websites. Keep shared interview fixes in this repository.
export const MEDICINE_ORIGIN = "https://mmipractice.co.uk";
export const SCHOOL_ORIGIN = "https://intrvue.ai";

// Activate the old-domain handover only after the new domain and auth redirects are verified.
export const MEDICINE_DOMAIN_LIVE = false;
export type SiteProduct = "medicine" | "11plus" | "combined";
export function siteProduct(hostname = window.location.hostname): SiteProduct {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (["mmipractice.co.uk", "www.mmipractice.co.uk"].includes(host))
    return "medicine";
  if (import.meta.env.DEV && host === "mmi.localhost") return "medicine";
  if (import.meta.env.DEV && host === "11plus.localhost") return "11plus";
  if (MEDICINE_DOMAIN_LIVE && ["intrvue.ai", "www.intrvue.ai"].includes(host))
    return "11plus";
  return "combined";
}
export const isMedicineSite = () => siteProduct() === "medicine";
export const siteName = () =>
  isMedicineSite() ? "MMI Practice" : "intrvue.ai";
export const isGuestDocument = () =>
  ["/guest-session", "/guest-feedback"].includes(window.location.pathname);

export function medicineHandoverTarget(
  url: URL,
  live = MEDICINE_DOMAIN_LIVE,
): string | null {
  if (
    !live ||
    !["intrvue.ai", "www.intrvue.ai"].includes(url.hostname.toLowerCase())
  )
    return null;
  // Browser-only notes must remain exportable at their original origin. In-progress
  // guest calls also stay in their original document until the user leaves.
  if (url.pathname === "/medicine/move" || url.pathname === "/guest-session")
    return null;
  if (
    url.pathname === "/try" ||
    url.pathname === "/medicine" ||
    url.pathname.startsWith("/medicine/") ||
    url.searchParams.get("mode") === "medicine" ||
    url.searchParams.has("medicinePractice")
  ) {
    return MEDICINE_ORIGIN + url.pathname + url.search + url.hash;
  }
  return null;
}
