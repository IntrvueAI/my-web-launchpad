import { describe, expect, it } from "vitest";
import { state } from "./fixtures/state";
import {
  guestInviteCode,
  verifyGuestInvite,
  guestDisplayName,
  authorizeGuestInterview,
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

describe("Private invitations", () => {
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
        })
      ).status,
    ).toBe(200);
    expect(
      (state.queries.find((q) => q.operation === "insert")?.value as any)
        .owner_id,
    ).toBe(state.user!.id);
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
