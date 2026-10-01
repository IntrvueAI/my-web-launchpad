import { describe, expect, it } from "vitest";
import { state } from "./fixtures/state";
import {
  guestInviteCode,
  verifyGuestInvite,
  guestDisplayName,
  authorizeGuestInterview,
  isShortGuestCode,
  newGuestLinkCode,
  guestReviewInput,
} from "../functions/_shared/guestTrials";
import { withJson, json } from "../functions/_shared/http";
const modules = import.meta.glob("../functions/*/index.ts");
const cache = new Map<string, (r: Request) => Promise<Response>>();
async function run(name: string, body: unknown) {
  if (!cache.has(name)) {
    await modules[`../functions/${name}/index.ts`]();
    cache.set(name, state.handler!);
  }
  return cache.get(name)!(
    new Request(`https://local.test/${name}`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-user",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}
const inviteId = "44444444-4444-4444-8444-444444444444";
const trialId = "55555555-5555-4555-8555-555555555555";
const sessionId = "66666666-6666-4666-8666-666666666666";
const nonce = "77777777-7777-4777-8777-777777777777";
const invite = {
  id: inviteId,
  label: "Test preview",
  expires_at: "2099-01-01T00:00:00Z",
  revoked_at: null,
  max_interviews: 12,
};
async function code() {
  state.env.MMI_GUEST_LINK_SECRET = "test-only-".repeat(8);
  return guestInviteCode(inviteId);
}

describe("Founder feedback inbox", () => {
  it("always scopes the inbox to the verified founder, ignoring supplied owner IDs", async () => {
    const payload = { trials: [], total: 0, page: 2 };
    state.rpc.mockImplementation(async (name) => ({
      data: name === "is_current_user_admin" ? true : payload,
      error: null,
    }));
    const response = await run("mmi-guest-access", {
      action: "feedback-inbox",
      ownerId: trialId,
      search: " Alice ",
      review: "issues",
      page: 2,
      inviteId,
      interviewType: "medicine-oxford-pilot",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(state.rpc).toHaveBeenCalledWith("get_mmi_feedback_inbox", {
      p_owner_id: state.user!.id,
      p_search: "Alice",
      p_review: "issues",
      p_page: 2,
      p_invite_id: inviteId,
      p_interview_type: "medicine-oxford-pilot",
    });
  });
  it("denies guests before making an inbox query", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    expect(
      (await run("mmi-guest-access", { action: "feedback-inbox" })).status,
    ).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("denies ordinary accounts and failed admin checks", async () => {
    state.rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (await run("mmi-guest-access", { action: "feedback-inbox" })).status,
    ).toBe(403);
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
  it("returns a safe retryable error without exposing database errors", async () => {
    state.rpc.mockImplementation(async (name) =>
      name === "is_current_user_admin"
        ? { data: true, error: null }
        : { data: null, error: { message: "private database detail" } },
    );
    const response = await run("mmi-guest-access", {
      action: "feedback-inbox",
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database detail");
  });
  it.each([
    { page: 0 },
    { page: 1.5 },
    { page: 100001 },
    { search: [] },
    { search: "a".repeat(101) },
    { review: "unknown" },
    { interviewType: "11-plus" },
    { inviteId: "forged" },
  ])("rejects malformed filters %j", async (filter) => {
    expect(
      (await run("mmi-guest-access", { action: "feedback-inbox", ...filter }))
        .status,
    ).toBe(400);
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("Private invitations", () => {
  it("generates independent URL-safe 128-bit short codes", () => {
    const codes = Array.from({ length: 64 }, () => newGuestLinkCode());
    expect(new Set(codes).size).toBe(64);
    expect(codes.every(isShortGuestCode)).toBe(true);
    for (const invalid of ["short", "a".repeat(23), "../examples", null])
      expect(isShortGuestCode(invalid)).toBe(false);
  });
  it("looks up a short link without exposing its bearer code", async () => {
    const shortCode = newGuestLinkCode();
    state.resolve = () => ({
      data: { ...invite, link_code: shortCode },
      error: null,
    });
    const response = await run("mmi-guest-access", {
      action: "inspect",
      code: shortCode,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).invite.link_code).toBeUndefined();
    expect(state.queries[0].filters).toContainEqual([
      "eq",
      ["link_code", shortCode],
    ]);
  });
  it("authenticates the invitation signature and rejects tampering", async () => {
    const signed = await code();
    expect(await verifyGuestInvite(signed)).toBe(inviteId);
    await expect(
      verifyGuestInvite(signed.replace(inviteId, trialId)),
    ).rejects.toThrow("not valid");
    await expect(
      verifyGuestInvite(
        signed.slice(0, -1) + (signed.endsWith("a") ? "b" : "a"),
      ),
    ).rejects.toThrow("not valid");
    await expect(verifyGuestInvite("")).rejects.toThrow("not valid");
  });
  it("fails closed when the signing secret is unavailable", async () => {
    await expect(guestInviteCode(inviteId)).rejects.toThrow("not configured");
  });
  it("accepts international names and rejects markup and oversized input", () => {
    expect(guestDisplayName("  Aïsha   O’Neil ")).toBe("Aïsha O’Neil");
    expect(guestDisplayName("王 小明")).toBe("王 小明");
    for (const name of ["", "x", "<script>name</script>", "a".repeat(81), null])
      expect(() => guestDisplayName(name)).toThrow();
  });
  it("does not create any records for unsigned links", async () => {
    expect(
      (await run("mmi-guest-access", { action: "redeem", code: "forged" }))
        .status,
    ).toBe(403);
    expect(state.queries).toHaveLength(0);
    expect(state.authCreate).not.toHaveBeenCalled();
  });
  it("requires acknowledgement and a client nonce before allocating a guest", async () => {
    const signed = await code();
    state.resolve = () => ({ data: invite, error: null });
    expect(
      (
        await run("mmi-guest-access", {
          action: "redeem",
          code: signed,
          name: "Test Guest",
          nonce,
        })
      ).status,
    ).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("issues only the guest session and never a password or founder identity", async () => {
    const signed = await code();
    state.resolve = (q) => ({
      data: q.table === "mmi_trial_invites" ? invite : null,
      error: null,
    });
    state.rpc.mockResolvedValue({
      data: { id: trialId, guest_user_id: null },
      error: null,
    });
    state.authCreate.mockResolvedValue({ error: null });
    state.authSignIn.mockResolvedValue({
      data: {
        user: { id: sessionId, app_metadata: { mmi_guest_trial: trialId } },
        session: {
          access_token: "guest-access",
          refresh_token: "guest-refresh",
        },
      },
      error: null,
    });
    const response = await run("mmi-guest-access", {
      action: "redeem",
      code: signed,
      name: "Test Guest",
      nonce,
      acknowledged: true,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { access_token: "guest-access", refresh_token: "guest-refresh" },
    });
    expect(state.authCreate.mock.calls[0][0].app_metadata).toEqual({
      mmi_guest_trial: trialId,
    });
    expect(
      state.queries.find((q) => q.table === "credits_balance")?.value,
    ).toEqual({ user_id: sessionId, credits: 0 });
  });
  it("refuses a retry which signs into the wrong identity", async () => {
    const signed = await code();
    state.resolve = () => ({ data: invite, error: null });
    state.rpc.mockResolvedValue({
      data: { id: trialId, guest_user_id: sessionId },
      error: null,
    });
    state.authSignIn.mockResolvedValue({
      data: {
        user: { id: state.user!.id, app_metadata: {} },
        session: { access_token: "wrong" },
      },
      error: null,
    });
    expect(
      (
        await run("mmi-guest-access", {
          action: "redeem",
          code: signed,
          name: "Test Guest",
          nonce,
          acknowledged: true,
        })
      ).status,
    ).toBe(503);
  });
  it("blocks expired invitations before allocating accounts", async () => {
    const signed = await code();
    state.resolve = () => ({
      data: { ...invite, expires_at: "2020-01-01T00:00:00Z" },
      error: null,
    });
    expect(
      (await run("mmi-guest-access", { action: "inspect", code: signed }))
        .status,
    ).toBe(403);
    expect(state.authCreate).not.toHaveBeenCalled();
  });
});
describe("Founder ownership", () => {
  it("rejects non-admins and guests", async () => {
    state.rpc.mockResolvedValue({ data: false, error: null });
    expect((await run("mmi-guest-access", { action: "list" })).status).toBe(
      403,
    );
    state.rpc.mockResolvedValue({ data: true, error: null });
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    expect((await run("mmi-guest-access", { action: "list" })).status).toBe(
      403,
    );
  });
  it("derives invitation ownership from the authenticated founder", async () => {
    await code();
    state.resolve = () => ({ data: invite, error: null });
    expect(
      (
        await run("mmi-guest-access", {
          action: "create",
          label: "Preview",
          owner_id: trialId,
          maxGuests: 50,
          maxInterviews: 12,
        })
      ).status,
    ).toBe(200);
    expect(
      (state.queries.find((q) => q.operation === "insert")?.value as any)
        .owner_id,
    ).toBe(state.user!.id);
    const inserted = state.queries.find((q) => q.operation === "insert")!
      .value as any;
    expect(inserted.max_guests).toBe(1);
    expect(inserted.max_interviews).toBe(2);
    expect(isShortGuestCode(inserted.link_code)).toBe(true);
  });
  it.each(["revoke", "guests", "feedback"])(
    "denies %s access to another founder’s invitation",
    async (action) => {
      state.resolve = () => ({ data: null, error: null });
      expect(
        (
          await run("mmi-guest-access", {
            action,
            inviteId,
            feedbackId: sessionId,
          })
        ).status,
      ).toBe(404);
      expect(state.queries[0].filters).toContainEqual([
        "eq",
        ["owner_id", state.user!.id],
      ]);
      expect(state.queries).toHaveLength(1);
    },
  );
  it("scopes feedback to the guests belonging to the owned invitation", async () => {
    state.resolve = (q) => ({
      data:
        q.table === "mmi_trial_invites"
          ? { id: inviteId }
          : q.table === "mmi_guest_trials"
            ? [{ guest_user_id: trialId }]
            : null,
      error: null,
    });
    expect(
      (
        await run("mmi-guest-access", {
          action: "feedback",
          inviteId,
          feedbackId: sessionId,
        })
      ).status,
    ).toBe(404);
    const query = state.queries.find((q) => q.table === "feedback")!;
    expect(query.filters).toContainEqual(["in", ["user_id", [trialId]]]);
  });
});
describe("Required beta product feedback", () => {
  it("summarises claimed and completed links for their owner", async () => {
    const short = newGuestLinkCode();
    state.resolve = (q) => ({
      data:
        q.table === "mmi_trial_invites"
          ? [{ ...invite, link_code: short }]
          : [
              {
                invite_id: inviteId,
                interviews_started: 2,
                mmi_trial_reviews: { created_at: "2026-10-01" },
              },
            ],
      error: null,
    });
    const response = await run("mmi-guest-access", { action: "list" });
    expect(response.status).toBe(200);
    expect((await response.json()).invites[0]).toMatchObject({
      code: short,
      guest_count: 1,
      attempts_used: 2,
      review_count: 1,
    });
    expect(state.queries[0].filters).toContainEqual([
      "eq",
      ["owner_id", state.user!.id],
    ]);
    expect(state.queries[1].filters).toContainEqual([
      "in",
      ["invite_id", [inviteId]],
    ]);
  });
  it("validates rating, experience and a bounded meaningful comment", () => {
    expect(
      guestReviewInput({
        rating: 4,
        experience: "smooth",
        improvement: "  Helpful practice  ",
      }),
    ).toEqual({
      rating: 4,
      experience: "smooth",
      improvement: "Helpful practice",
    });
    for (const patch of [
      { rating: 0 },
      { rating: 6 },
      { rating: 2.5 },
      { rating: "4" },
      { experience: "unknown" },
      { improvement: "    " },
      { improvement: "a".repeat(1501) },
    ]) {
      expect(() =>
        guestReviewInput({
          rating: 4,
          experience: "smooth",
          improvement: "Helpful practice",
          ...patch,
        }),
      ).toThrow("complete the short feedback");
    }
  });
  it.each(["status", "request-review", "submit-review"])(
    "requires a restricted guest identity for %s",
    async (action) => {
      const response = await run("mmi-guest-access", { action });
      expect(response.status).toBe(403);
      expect(state.rpc).not.toHaveBeenCalled();
    },
  );
  it("saves product feedback only for the authenticated tester", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    state.rpc.mockResolvedValue({
      data: { trialId, phase: "complete" },
      error: null,
    });
    const response = await run("mmi-guest-access", {
      action: "submit-review",
      userId: sessionId,
      trialId: inviteId,
      rating: 4,
      experience: "some-issues",
      improvement: "The audio was too quiet",
    });
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("submit_mmi_trial_review", {
      p_user_id: state.user!.id,
      p_rating: 4,
      p_experience: "some-issues",
      p_improvement: "The audio was too quiet",
    });
  });
  it("rejects malformed feedback before any database call", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    expect(
      (await run("mmi-guest-access", { action: "submit-review", rating: 5 }))
        .status,
    ).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("does not accept a status response belonging to another trial", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    state.rpc.mockResolvedValue({ data: { trialId: inviteId }, error: null });
    expect((await run("mmi-guest-access", { action: "status" })).status).toBe(
      403,
    );
  });
  it("keeps temporary database errors retryable without exposing diagnostics", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    state.rpc.mockResolvedValue({
      data: null,
      error: { message: "private database details" },
    });
    const response = await run("mmi-guest-access", { action: "status" });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database details");
  });
  it("returns tester reviews only for trials inside the owned invitation", async () => {
    state.resolve = (q) => ({
      data:
        q.table === "mmi_trial_invites"
          ? { id: inviteId }
          : q.table === "mmi_guest_trials"
            ? [{ id: trialId, guest_user_id: sessionId }]
            : [],
      error: null,
    });
    expect(
      (await run("mmi-guest-access", { action: "guests", inviteId })).status,
    ).toBe(200);
    expect(
      state.queries.find((q) => q.table === "mmi_trial_reviews")!.filters,
    ).toContainEqual(["in", ["trial_id", [trialId]]]);
  });
});
describe("Guest engine boundary", () => {
  it("bounds guest avatar duration and forces the shared brain", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    state.resolve = (q) => ({
      data: q.columns?.includes("interview_type")
        ? {
            id: sessionId,
            interview_type: "medicine-ethics-practice",
            status: "active",
          }
        : null,
      count: 0,
      error: null,
    });
    state.rpc.mockResolvedValue({ data: { trial_id: trialId }, error: null });
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ sessionToken: "guest-token" })),
    );
    const response = await run("get-anam-session-token", {
      sessionReference: "REF",
      engineDriven: false,
      personaConfig: {
        name: "Clara",
        avatarId: "untrusted",
        voiceId: "untrusted",
        maxSessionLengthSeconds: 7200,
        systemPrompt: "untrusted",
      },
    });
    expect(response.status).toBe(200);
    const sent = JSON.parse(state.fetch.mock.calls[0][1].body).personaConfig;
    expect(sent.maxSessionLengthSeconds).toBe(420);
    expect(sent.llmId).toBe("CUSTOMER_CLIENT_V1");
    expect(sent.systemPrompt).toBeUndefined();
    expect(sent.avatarId).not.toBe("untrusted");
  });
  it("leaves ordinary users on the existing path without a guest database lookup", async () => {
    expect(
      await authorizeGuestInterview(
        { rpc: state.rpc },
        state.user!,
        null,
        "brain",
      ),
    ).toBe(false);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("denies expired trial calls before contacting Anam", async () => {
    state.user!.app_metadata = { mmi_guest_trial: trialId };
    state.resolve = () => ({
      data: { id: sessionId, interview_type: "medicine-mmi", status: "active" },
      count: 0,
      error: null,
    });
    state.rpc.mockResolvedValue({
      data: null,
      error: { message: "Your guest trial has expired" },
    });
    const response = await run("get-anam-session-token", {
      sessionReference: "REF",
      personaConfig: {},
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Your guest trial has expired",
    });
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it.each(["brain", "token", "feedback"] as const)(
    "requires a real owned session for guest %s",
    async (kind) => {
      state.user!.app_metadata = { mmi_guest_trial: trialId };
      await expect(
        authorizeGuestInterview({ rpc: state.rpc }, state.user!, null, kind),
      ).rejects.toThrow("active guest interview");
      expect(state.rpc).not.toHaveBeenCalled();
    },
  );
  it("does not allow URL suffixes to bypass the endpoint guest restriction", async () => {
    const token = `header.${btoa(JSON.stringify({ app_metadata: { mmi_guest_trial: trialId } }))}.signature`;
    const boundary = withJson(async () => json({ unexpectedlyAllowed: true }));
    const req = new Request("https://test/send-email/interview-brain", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{}",
    });
    expect((await boundary(req)).status).toBe(403);
  });
});
