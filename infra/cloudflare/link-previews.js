/**
 * Cloudflare Worker: per-domain link previews.
 *
 * intrvue.ai and mmipractice.co.uk are served the same index.html, whose preview tags describe
 * intrvue.ai (11+). Link scrapers (WhatsApp, iMessage, Slack, LinkedIn, X) don't run JavaScript,
 * so the MMI Practice tags must be rewritten before the HTML leaves the edge. This Worker does
 * only that: it passes every request through unchanged and, for HTML on mmipractice.co.uk (and
 * referral links on either domain), replaces the title, description and preview tags.
 *
 * Route: mmipractice.co.uk/*  (and optionally intrvue.ai/r/* for referral-link wording).
 */
const SITES = {
  medicine: {
    siteName: "MMI Practice",
    title: "MMI Practice — practise your MMI before it counts",
    description: "Live Medicine stations with Clara, an AI interviewer, and written feedback grounded in what you said.",
    image: "https://mmipractice.co.uk/og/mmi-practice.png",
    imageAlt: "MMI Practice: practise your MMI before it counts, with Clara the AI interviewer",
    invite: "You're invited to MMI Practice",
  },
  school: {
    siteName: "intrvue.ai",
    title: "intrvue.ai — practise the 11+ interview out loud",
    description: "Spoken mock interviews with Clara, an AI interviewer, and feedback written for parents.",
    image: "https://intrvue.ai/og/intrvue-11plus.png",
    imageAlt: "intrvue.ai: the 11+ interview, rehearsed out loud, with Clara the AI interviewer",
    invite: "You're invited to intrvue.ai",
  },
};

class SetContent {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute("content", this.value); }
}
class SetText {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}

export default {
  async fetch(request) {
    const response = await fetch(request);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    const url = new URL(request.url);
    const medicine = url.hostname.replace(/^www\./, "") === "mmipractice.co.uk";
    const referral = /^\/r\/[a-z0-9-]{3,24}\/?$/i.test(url.pathname);
    if (!medicine && !referral) return response;
    const site = SITES[medicine ? "medicine" : "school"];
    const title = referral ? `${site.invite} — first purchase discount inside` : site.title;
    return new HTMLRewriter()
      .on("title", new SetText(title))
      .on('meta[name="description"]', new SetContent(site.description))
      .on('meta[property="og:site_name"]', new SetContent(site.siteName))
      .on('meta[property="og:title"]', new SetContent(title))
      .on('meta[property="og:description"]', new SetContent(site.description))
      .on('meta[property="og:image"]', new SetContent(site.image))
      .on('meta[property="og:image:alt"]', new SetContent(site.imageAlt))
      .on('meta[name="twitter:title"]', new SetContent(title))
      .on('meta[name="twitter:description"]', new SetContent(site.description))
      .on('meta[name="twitter:image"]', new SetContent(site.image))
      .transform(response);
  },
};
