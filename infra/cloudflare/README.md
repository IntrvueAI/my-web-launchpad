# Per-domain link previews

`index.html` describes intrvue.ai (11+). Both domains serve that same file, and link scrapers
don't run JavaScript, so a shared mmipractice.co.uk link would preview as intrvue.ai.
`link-previews.js` is a Cloudflare Worker that rewrites the preview tags for mmipractice.co.uk
(and gives referral links `/r/<code>` invitation wording). It changes nothing else.

## Set up (about five minutes, needs the domain's DNS in your Cloudflare account)

1. Cloudflare dashboard → Workers & Pages → Create → Worker → name it `link-previews`.
2. Replace the code with `link-previews.js` and deploy.
3. Worker → Settings → Domains & Routes → Add route: `mmipractice.co.uk/*` (zone mmipractice.co.uk).
   Optional: add `intrvue.ai/r/*` (zone intrvue.ai) for referral-link wording on 11+ links.
4. Check: open https://www.opengraph.xyz/url/https%3A%2F%2Fmmipractice.co.uk and confirm the
   MMI Practice image and title. Re-scrape cached previews with
   https://developers.facebook.com/tools/debug/ (WhatsApp and Facebook share this cache) and
   https://www.linkedin.com/post-inspector/.

If the domain's DNS is not on Cloudflare (or is managed by the hosting provider), the route
can't be added; tell us where the DNS is managed and we'll pick the equivalent.
