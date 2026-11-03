// One release, two product websites. Keep shared interview fixes in this repository: both sites
// run the same build and the same interview brain; only the domain decides which product shows.
export const MEDICINE_ORIGIN = "https://mmipractice.co.uk";
export const SCHOOL_ORIGIN = "https://intrvue.ai";

// The domains are split: intrvue.ai is 11+ only and mmipractice.co.uk is Medicine only. Other
// hosts (Lovable previews) stay "combined" so both products can be tested from one place.
export const MEDICINE_DOMAIN_LIVE = true;
export type SiteProduct = "medicine" | "11plus" | "combined";
const SCHOOL_HOSTS = ["intrvue.ai", "www.intrvue.ai"];
const MEDICINE_HOSTS = ["mmipractice.co.uk", "www.mmipractice.co.uk"];
export function siteProduct(hostname = window.location.hostname): SiteProduct {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (MEDICINE_HOSTS.includes(host)) return "medicine";
  if (import.meta.env.DEV && host === "mmi.localhost") return "medicine";
  if (import.meta.env.DEV && host === "11plus.localhost") return "11plus";
  if (MEDICINE_DOMAIN_LIVE && SCHOOL_HOSTS.includes(host)) return "11plus";
  return "combined";
}
export const isMedicineSite = () => siteProduct() === "medicine";
export const siteName = () =>
  isMedicineSite() ? "MMI Practice" : "intrvue.ai";
export const isGuestDocument = () =>
  ["/guest-session", "/guest-feedback"].includes(window.location.pathname);

/** The tester invitation this tab is holding (set by index.html and GuestWelcome). */
type InviteStorage = Pick<Storage, "getItem">;
function heldInvite(storage?: InviteStorage | null) {
  try {
    return {
      code: storage?.getItem("mmi:trial-invite") || "",
      product: storage?.getItem("mmi:trial-product") || "",
    };
  } catch {
    return { code: "", product: "" };
  }
}

/** Medicine pages opened on intrvue.ai belong on mmipractice.co.uk. */
export function medicineHandoverTarget(
  url: URL,
  live = MEDICINE_DOMAIN_LIVE,
  storage: InviteStorage | null = null,
): string | null {
  if (!live || !SCHOOL_HOSTS.includes(url.hostname.toLowerCase())) return null;
  // Browser-only notes must remain exportable at their original origin. In-progress
  // guest calls also stay in their original document until the user leaves.
  if (url.pathname === "/medicine/move" || url.pathname === "/guest-session") return null;
  if (url.pathname === "/try") {
    // /try serves both products' tester invitations. Hand over only a Medicine one, carrying its
    // code (session storage doesn't cross domains); an 11+ invitation stays here.
    if (url.hash) return MEDICINE_ORIGIN + url.pathname + url.search + url.hash;
    const invite = heldInvite(storage);
    if (invite.product !== "medicine") return null;
    return MEDICINE_ORIGIN + (invite.code ? `/medicine/${invite.code}` : "/try");
  }
  if (
    url.pathname === "/medicine" ||
    url.pathname.startsWith("/medicine/") ||
    url.searchParams.get("mode") === "medicine" ||
    url.searchParams.has("medicinePractice")
  ) {
    return MEDICINE_ORIGIN + url.pathname + url.search + url.hash;
  }
  return null;
}

/** 11+ pages opened on mmipractice.co.uk belong on intrvue.ai. */
export function schoolHandoverTarget(
  url: URL,
  live = MEDICINE_DOMAIN_LIVE,
  storage: InviteStorage | null = null,
): string | null {
  if (!live || !MEDICINE_HOSTS.includes(url.hostname.toLowerCase())) return null;
  if (url.pathname === "/guest-session") return null;
  if (url.pathname === "/try") {
    const invite = heldInvite(storage);
    if (invite.product !== "11plus") return null;
    return SCHOOL_ORIGIN + (invite.code ? `/11plus/${invite.code}` : "/try");
  }
  if (/^\/(11plus\/|schools(\/|$)|classes\/?$|join-class\/)/.test(url.pathname)) {
    return SCHOOL_ORIGIN + url.pathname + url.search + url.hash;
  }
  return null;
}

/** Where this page belongs, if it was opened on the other product's domain. */
export function domainHandoverTarget(url: URL, storage: InviteStorage | null = null): string | null {
  return medicineHandoverTarget(url, MEDICINE_DOMAIN_LIVE, storage) ?? schoolHandoverTarget(url, MEDICINE_DOMAIN_LIVE, storage);
}
