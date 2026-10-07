# Sign-in incident — 7 October 2026

## Confirmed failures

- Google returns `401 deleted_client` on both public sites. The configured OAuth client was deleted at Google. No replacement credentials are available in this workspace. This cannot be repaired by changing a Supabase redirect URL.
- Supabase's function gateway returned **401** for the reported ethics attempt `LBG4JHW0HT` at `2026-10-06T21:51:48.343Z`. The previous release's single token-refresh retry was verified against a real Anam interview. The original log does not establish why that token was rejected.
- Authentication email delivery returns HTTP 500 with an SMTP 535 rejection. Supabase was also configured for only two authentication emails per hour.
- The separate deployed Resend API key is valid, but its account had no sending domains. The existing `resend._domainkey.intrvue.ai` DNS value does not match the newly registered domain. Email delivery remains blocked.

## Applied to the backend

- Set the authentication email allowance to **100/hour** on the existing custom SMTP service; other request limits are unchanged.
- Prepared a sign-in email with a one-time code and a confirmation link.
- Replaced the rejected SMTP credential, then created a separate Resend key restricted to sending (`Supabase authentication 2026-10-07`, ID `e9e92dd1-6c84-4bcc-b75f-18e737f628f7`) and installed it in Supabase SMTP. The other deployed Resend key was retained. **A subsequent SMTP delivery check still failed; this is not a claim that email is restored.**
- Registered `intrvue.ai` with Resend in `eu-west-1`, matching the existing MX record. Verification is pending. Click/open tracking is disabled.
- Deployed safe error classification in `send-auth-email`, recording credential, sender-domain and provider-limit failures without message contents or keys.
- Removed the temporary service-role-only diagnostic/repair endpoint after use. No production user passwords, credits or interview records were changed.

## Frontend release

- Existing passwords are checked for presence when signing in, not against the stronger policy for creating a new password. This fixes valid older passwords being rejected by the browser.
- Failed password resets retain the form and show an error.
- An email-code sign-in flow is implemented for existing accounts only, with resend cooldown, safe error messages, one-time-code autofill and correction/retry support. Supabase verifies the code; no authentication bypass is introduced.
- Google and email-dependent actions are temporarily unavailable by default, with an explanation. Password sign-in remains available. This avoids inviting users into providers confirmed to be broken.
- After their respective services are verified, set `VITE_GOOGLE_SIGN_IN_ENABLED=true` and `VITE_EMAIL_SIGN_IN_ENABLED=true` in the deployment and rebuild. They are independent switches.

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

Create or restore a Google Web application OAuth client. Its authorised redirect must be:

```text
https://fjkuuzfuysemrofcmnvd.supabase.co/auth/v1/callback
```

Website origins: `https://intrvue.ai`, `https://www.intrvue.ai`, `https://mmipractice.co.uk`, `https://www.mmipractice.co.uk`. Configure its ID/secret in the existing Supabase Google provider. Downloaded client JSON can be installed from the local workspace without pasting the secret into chat. Verify the Google audience/publishing configuration and complete an actual user sign-in before enabling the button.

### Frontend publishing

Pushes to `IntrvueAI/my-web-launchpad` main are not proof of publication. Publish the synced release through the existing Lovable project. A Lovable integration has been suggested but is not connected yet.

## Verification and limits

- Medicine ethics: injected first-token 401, real refresh and second-token 200, real Anam video/audio, reading timer, two answers and follow-ups, saved transcript/feedback and closed call.
- 11+: real authentication, credit charge, Anam video/audio, two answers/follow-ups, saved feedback and closed call.
- Email UI: delivery failure leaves a retryable form; incorrect OTP rejected; real Supabase OTP verification preserves the same account; resend is disabled during cooldown; no mobile horizontal overflow. **SMTP delivery was substituted in the browser test because the real provider is blocked.** A separate real SMTP check failed as described above.
- Existing six-character password signs in through the updated frontend against the live backend.
- One-time-code replay rejected by Supabase; temporary QA accounts/data removed.
- 391 application tests and 159 backend tests pass, along with typecheck and build. The release's CI run also checks database access and all edge functions. These tests do not establish that Google login or external email delivery is restored.

References: [Supabase passwordless sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [authentication rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Google client restoration](https://support.google.com/cloud/answer/15549257?hl=en), [Resend testing addresses](https://resend.com/docs/dashboard/emails/send-test-emails).
