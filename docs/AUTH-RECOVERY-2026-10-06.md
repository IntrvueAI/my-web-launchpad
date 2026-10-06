# Sign-in and interview connection recovery — 6 October 2026

## Confirmed findings

- Both public sites redirect Google sign-in to Google's `401: deleted_client` page. The configured client is `997558017430-l20ft23ptv0g9d4lfeh8qp12a4l88evm.apps.googleusercontent.com`. The MMI return URLs are already allowed by Supabase. Restoring/replacing that client requires the owner's Google Cloud access; no credentials or provider configuration were changed in this release.
- A failed logout request kept browser credentials and the signed-in dashboard. This was reproduced on the public Medicine frontend by injecting HTTP 503 into a temporary test account's logout request.
- The reported failed interview has a client-side avatar authorisation error, but the old logging did not record the HTTP status or response body. Its exact rejection reason has not been established. A fresh authenticated request to the deployed avatar endpoint returned HTTP 200.

## Changes

- Logout waits up to four seconds for server revocation, then falls back to clearing this browser's authentication and reloading the sign-in page. Failed remote revocation cannot be claimed as a logout on every device.
- Scoped authentication storage prevents an in-flight refresh from restoring credentials during fallback. Practice notes, preferences and separate guest credentials are preserved.
- Other account tabs respond to removal of the shared login. Private cached results and onboarding state are cleared; stale initial-session/refresh callbacks cannot restore the signed-out UI.
- Repeated clicks share one logout request. A failed initial session lookup no longer leaves authentication loading forever.
- Avatar authorisation retries once after refreshing a rejected login. It does not retry permission, quota or provider errors as authentication errors.
- Edge-function failures show safe guidance for expired authentication, an active interview in another tab, an expired interview, access denial and temporary service failures. Logs now retain HTTP status with the existing request identifier, without displaying raw provider bodies.

## Verification

- 381 application tests (25 added), including failed/hung logout, late refresh writes, guest isolation, stale auth events, refresh limits and error response preservation.
- Browser tests with a temporary account passed normal logout, HTTP 401, HTTP 503 and a request that never responds. Reload stayed signed out. Two account tabs signed out after a failure, and a fresh password sign-in succeeded afterwards.
- A real Medicine ethics interview passed an injected authorisation 401, actual session refresh, successful token retry, Anam audio/video, two answers/follow-ups, saved assessment and closed WebRTC.
- A real 11+ interview passed Anam audio/video, two answers, saved partial assessment and exactly three test credits charged.
- Temporary test accounts and interviews were removed.

## Release

Publish the frontend in Lovable after GitHub sync. No database migration or edge-function deployment is required. Google sign-in remains blocked until its deleted client is restored or valid replacement credentials are configured in Supabase. Restoring the client must be followed by an actual Google sign-in check; successful password tests do not prove OAuth completion.
