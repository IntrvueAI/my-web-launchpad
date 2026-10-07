# Sign-in incident — 7 October 2026

## Confirmed failures

- Google originally returned `401 deleted_client` on both public sites. The configured OAuth client was deleted at Google. Replacement credentials have now been installed as described below; the old error no longer appears when opening the Google sign-in form.
- Supabase's function gateway returned **401** for the reported ethics attempt `LBG4JHW0HT` at `2026-10-06T21:51:48.343Z`. The previous release's single token-refresh retry was verified against a real Anam interview. The original log does not establish why that token was rejected.
- Authentication email delivery originally returned HTTP 500 with an SMTP 535 rejection. A fresh password-reset request now reaches the mail service and is rejected with SMTP 550 because `intrvue.ai` is not verified. The credential repair has taken effect; DNS verification is the confirmed remaining email blocker. Supabase was also configured for only two authentication emails per hour.
- The separate deployed Resend API key is valid, but its account had no sending domains. The existing `resend._domainkey.intrvue.ai` DNS value does not match the newly registered domain. Email delivery remains blocked.

## Applied to the backend

- Set the authentication email allowance to **100/hour** on the existing custom SMTP service; other request limits are unchanged.
- Prepared a sign-in email with a one-time code and a confirmation link.
- Replaced the rejected SMTP credential, then created a separate Resend key restricted to sending (`Supabase authentication 2026-10-07`, ID `e9e92dd1-6c84-4bcc-b75f-18e737f628f7`) and installed it in Supabase SMTP. The other deployed Resend key was retained. **A subsequent SMTP delivery check still failed; this is not a claim that email is restored.**
- Registered `intrvue.ai` with Resend in `eu-west-1`, matching the existing MX record. Verification is pending. Click/open tracking is disabled.
- Deployed safe error classification in `send-auth-email`, recording credential, sender-domain and provider-limit failures without message contents or keys.
- Removed the temporary service-role-only diagnostic/repair endpoint after use. No production user passwords, credits or interview records were changed.
- Added exact return addresses for MMI `/auth` (canonical and www) and Intrvue www root/auth/reset-password. An MMI recovery link generated with the old settings page's `/auth` destination previously fell back to `intrvue.ai/`. The repaired allowlist preserves that destination; other authentication configuration is unchanged.

## Frontend release

- Existing passwords are checked for presence when signing in, not against the stronger policy for creating a new password. This fixes valid older passwords being rejected by the browser.
- Failed password resets retain the form and show an error.
- An email-code sign-in flow is implemented for existing accounts only, with resend cooldown, safe error messages, one-time-code autofill and correction/retry support. Supabase verifies the code; no authentication bypass is introduced.
- Google is available by default again after installing the replacement registration and verifying the Google sign-in form. An explicit `VITE_GOOGLE_SIGN_IN_ENABLED=false` still hides the button during a provider outage. Email-dependent actions remain unavailable by default. Password sign-in remains available.
- `VITE_EMAIL_SIGN_IN_ENABLED=true` must only be set after real email delivery is verified. These are independent switches. The sign-up page now directs users to Google while email registration is unavailable.

### Password reset repair

- Settings → Security → Change password now opens the password form using the user's authenticated Supabase session. This also lets a signed-in Google user set a password without depending on email delivery. Supabase still authenticates and authorizes the password update.
- The former settings action sent recovery links to `/auth`. Recovery events now route to `/reset-password` and clear unrelated saved sign-in destinations.
- Forgot Password is clickable during the email outage. It explains the delivery problem and offers Google sign-in with a saved return to the password form. Email sending stays disabled until delivery is verified. Once enabled, failed sends retain the form and successful sends display an account-neutral confirmation.
- The reset form waits for authentication initialization, explains expired or reused links, allows retry after connection failures, identifies the account being changed, and applies the actual eight-character/uppercase/lowercase/number password requirements. Backend failures retain the inputs with safe errors. Successful updates show a deliberate Continue button rather than immediately redirecting an authenticated user to sign-in.
- Real browser checks on the prepared release passed for both domains: genuine Supabase recovery links, the legacy MMI return, password update, rejection of the previous password, successful new-password login to the same account, rejected link reuse, and password changes using an existing session. Mobile layout and Google recovery return checks passed. The links were generated for temporary QA accounts through the admin API; this verifies recovery independently of blocked email delivery. All temporary accounts were removed.

## Outstanding external steps

### Intrvue DNS at GoDaddy

Use the DNS settings for **intrvue.ai**, not mmipractice.co.uk. The existing authoritative nameservers are `ns55.domaincontrol.com` and `ns56.domaincontrol.com`.

1. Replace the TXT value at `resend._domainkey` with:

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDs+CsQkowqsdPH73vsolMZkYt6MmIw4XkqE3TLPUqpoHOtifsi8BH5elSnzauUnj+o36jl4mbKkbOYKoEyCmurME1IlMMueIh51oIC8lGUh/08+l64G7luLrgxSk85i0fT07HhRGX5zga04qpRGMfzVvOA2aoMmcgWTZ4YpGt15wIDAQAB
```

2. Add CNAME `rsend` → `send.forge.rmta.net`, as returned by Resend.
3. Preserve the existing MX `send` → `feedback-smtp.eu-west-1.amazonses.com` (priority 10) and TXT `send` → `v=spf1 include:amazonses.com ~all`; both already match.
4. Verify the domain in Resend (`a745b857-9f77-45ef-9f3e-eda235b6f889`). Re-test a real Supabase sign-in email and password-reset email before enabling the email UI. If SMTP 535 persists after domain verification, resolve the SMTP credential/provider issue before enabling it.

### Google login

Installed the user-supplied replacement Google Web application OAuth client in the existing Supabase project, preserving all unrelated authentication settings. Its authorised redirect is:

```text
https://fjkuuzfuysemrofcmnvd.supabase.co/auth/v1/callback
```

Website origins verified in the downloaded registration: `https://intrvue.ai`, `https://www.intrvue.ai`, `https://mmipractice.co.uk`, `https://www.mmipractice.co.uk`. The client secret was read from the user-supplied local JSON and sent only to the intended Supabase configuration endpoint and Google's token endpoint; it is not in the repository or browser code.

Both sites' backend authorization requests now redirect to Google using the replacement client and correct callback. Browser checks reach Google's email/phone sign-in form without `deleted_client`, `invalid_client`, or `redirect_uri_mismatch`. An intentionally invalid authorization code is rejected with `invalid_grant`; this is not a successful token exchange.

The prepared production build was also served under each site's origin in an isolated browser: both Sign In and Sign Up buttons reached the real Google form through real Supabase requests, with the correct return-to-site parameter and no page errors (four checks). This is a local release check, not confirmation of public deployment. The 23 targeted authentication tests, typecheck and production build pass.

Remaining verification: publish the button update, then complete an actual Google account sign-in and confirm return to the correct site with the existing account/interview history. Google audience restrictions and account consent cannot be established by an unauthenticated sign-in-form check.

### Frontend publishing

Pushes to `IntrvueAI/my-web-launchpad` main are not proof of publication. Publish the synced release through the existing Lovable project. A Lovable integration has been suggested but is not connected yet.

The user published the Google repair, and live checks now reach Google's sign-in form from both public sites. The password-reset changes need a new publication after their push.

## Verification and limits

- Medicine ethics: injected first-token 401, real refresh and second-token 200, real Anam video/audio, reading timer, two answers and follow-ups, saved transcript/feedback and closed call.
- 11+: real authentication, credit charge, Anam video/audio, two answers/follow-ups, saved feedback and closed call.
- Email UI: delivery failure leaves a retryable form; incorrect OTP rejected; real Supabase OTP verification preserves the same account; resend is disabled during cooldown; no mobile horizontal overflow. **SMTP delivery was substituted in the browser test because the real provider is blocked.** A separate real SMTP check failed as described above.
- Existing six-character password signs in through the updated frontend against the live backend.
- One-time-code replay rejected by Supabase; temporary QA accounts/data removed.
- 391 application tests and 159 backend tests pass, along with typecheck and build. The release's CI run also checks database access and all edge functions. These tests do not establish that Google login or external email delivery is restored.

References: [Supabase passwordless sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [authentication rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Google client restoration](https://support.google.com/cloud/answer/15549257?hl=en), [Resend testing addresses](https://resend.com/docs/dashboard/emails/send-test-emails).
