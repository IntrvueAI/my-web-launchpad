import { describe, expect, it, vi } from "vitest";
import { AudioBuffer } from "../functions/_shared/audioBuffer";
import { readFileSync, readdirSync } from "node:fs";
import { state } from "./fixtures/state";

const modules = import.meta.glob("../functions/*/index.ts");
async function handler(name: string) {
  // Each function is imported once; retain handlers for subsequent cases without clearing shared fixtures.
  if (!cache.has(name)) {
    await modules[`../functions/${name}/index.ts`]();
    cache.set(name, state.handler!);
  }
  return cache.get(name)!;
}
const cache = new Map<string, (request: Request) => Promise<Response>>();
const req = (
  body: unknown = {},
  headers: Record<string, string> = { authorization: "Bearer user-token" },
) =>
  new Request("https://local.test/function", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const session = {
  id: "session-uuid",
  user_id: "11111111-1111-4111-8111-111111111111",
  interview_type: "medicine-mmi",
  status: "active",
  engine_revision: 0,
  engine_state: null,
};
const persona = {
  name: "Clara",
  avatarId: "avatar",
  voiceId: "voice",
  maxSessionLengthSeconds: 1800,
  engineDriven: true,
};
const regular = [
  "admin-credit-management",
  "create-payment",
  "generate-interview-feedback",
  "get-anam-session-token",
  "interview-brain",
  "send-auth-email",
  "send-bug-report",
  "send-email",

  "verify-payment",
  "warmup-questions",
];
describe.each(regular)("%s HTTP boundary", (name) => {
  it("supports preflight and rejects unsupported methods", async () => {
    const run = await handler(name);
    expect(
      (await run(new Request("https://local.test", { method: "OPTIONS" })))
        .status,
    ).toBe(204);
    expect((await run(new Request("https://local.test"))).status).toBe(405);
  });
  it("rejects unauthenticated and non-object JSON without provider calls", async () => {
    const run = await handler(name);
    expect((await run(req({}, {}))).status).toBe(401);
    expect((await run(req(null))).status).toBe(400);
    expect((await run(req([]))).status).toBe(400);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("limits actual streamed bytes, even without content-length", async () => {
    const run = await handler(name);
    expect((await run(req({ data: "x".repeat(262_145) }))).status).toBe(413);
  });
});

describe("Anam tokens", () => {
  it("passes custom-engine settings and preserves the existing legacy mode", async () => {
    const run = await handler("get-anam-session-token");
    state.resolve = (q) => ({
      data:
        q.table === "interview_sessions" &&
        q.columns?.includes("interview_type")
          ? session
          : null,
      count: 0,
      error: null,
    });
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ sessionToken: "token" })),
    );
    const response = await run(
      req({
        personaConfig: persona,
        sessionReference: "S123",
        engineDriven: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sessionToken: "token" });
    const sent = JSON.parse(state.fetch.mock.calls[0][1].body);
    expect(sent.personaConfig.llmId).toBe("CUSTOMER_CLIENT_V1");
    expect(sent.personaConfig).not.toHaveProperty("systemPrompt");
    state.fetch.mockResolvedValue(
      new Response(JSON.stringify({ sessionToken: "legacy-token" })),
    );
    expect(
      (
        await run(
          req({
            personaConfig: {
              ...persona,
              engineDriven: false,
              brainType: "gpt-4o",
              systemPrompt: "Legacy prompt",
            },
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      JSON.parse(state.fetch.mock.calls[1][1].body).personaConfig.systemPrompt,
    ).toBe("Legacy prompt");
  });
  it("rejects a session belonging to someone else and non-admin pilots", async () => {
    const run = await handler("get-anam-session-token");
    expect(
      (await run(req({ personaConfig: persona, sessionReference: "OTHER" })))
        .status,
    ).toBe(403);
    state.resolve = () => ({
      data: { ...session, interview_type: "medicine-oxford-pilot" },
      error: null,
    });
    state.rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (await run(req({ personaConfig: persona, sessionReference: "PILOT" })))
        .status,
    ).toBe(403);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("rejects unlimited duration and a malformed provider response", async () => {
    const run = await handler("get-anam-session-token");
    expect(
      (
        await run(
          req({ personaConfig: { ...persona, maxSessionLengthSeconds: 0 } }),
        )
      ).status,
    ).toBe(400);
    state.fetch.mockResolvedValue(new Response("{}"));
    expect((await run(req({ personaConfig: persona }))).status).toBe(502);
  });
});

describe("Interview brain ownership and retries", () => {
  it("exposes only the candidate prompt for an academic exercise", async () => {
    state.resolve = () => ({ data: { ...session, interview_type: "medicine-oxford-pilot", engine_state: {
      mode: "mock", difficulty: 2, questionIndex: 0, targetQuestions: 4, done: false,
      current: { id: "OX1", question: "How would you test this explanation?", topic: "scientific-reasoning", answer: "PRIVATE ANSWER", rubric: {strong:"PRIVATE RUBRIC"}, hints:["PRIVATE HINT"] },
      lastTurn: { id: "repeat-turn", say: "How would you test this explanation?" },
    } }, error: null });
    const result = await (await handler("interview-brain"))(req({sessionId:"S1",action:"repeat",turnId:"repeat-turn"}));
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.uiState.exercise).toEqual({id:"OX1",prompt:"How would you test this explanation?",topic:"scientific-reasoning"});
    expect(JSON.stringify(body)).not.toContain("PRIVATE");
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("denies another user’s session before spending on AI", async () => {
    state.resolve = () => ({
      data: { ...session, user_id: "another-user" },
      error: null,
    });
    expect(
      (
        await (
          await handler("interview-brain")
        )(req({ sessionId: "S123", action: "start" }))
      ).status,
    ).toBe(403);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("rejects invalid turn input before session writes", async () => {
    const run = await handler("interview-brain");
    for (const body of [
      { sessionId: {}, action: "start" },
      { sessionId: "S1", action: "answer", turnId: "" },
      { sessionId: "S1", action: "answer", studentText: "x".repeat(12001) },
    ]) {
      expect((await run(req(body))).status).toBe(400);
    }
    expect(state.queries).toHaveLength(0);
  });
  it("requires admin access for the draft schools", async () => {
    state.resolve = () => ({
      data: { ...session, interview_type: "medicine-cambridge-pilot" },
      error: null,
    });
    state.rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (
        await (
          await handler("interview-brain")
        )(req({ sessionId: "S123", action: "start" }))
      ).status,
    ).toBe(403);
  });
});

describe("Payments", () => {
  const paid = {
    id: "cs_test_example",
    payment_status: "paid",
    amount_total: 1999,
    currency: "gbp",
    client_reference_id: session.user_id,
    metadata: { credits: "2" },
  };
  it("verification uses one settlement transaction and preserves the response contract", async () => {
    state.resolve = () => ({
      data: { id: "order", user_id: session.user_id },
      error: null,
    });
    state.stripe.checkout.sessions.retrieve.mockResolvedValue(paid);
    const settled = {
      ok: true,
      alreadyProcessed: false,
      credits_added: 2,
      balance: 5,
    };
    state.rpc.mockResolvedValue({ data: settled, error: null });
    const response = await (
      await handler("verify-payment")
    )(req({ session_id: paid.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(settled);
    expect(state.rpc).toHaveBeenCalledWith(
      "settle_checkout_payment",
      expect.objectContaining({
        p_amount: 1999,
        p_credits: 2,
        p_user_id: session.user_id,
      }),
    );
    expect(state.queries.some((q) => q.operation !== "select")).toBe(false);
  });
  it("denies unknown or unowned orders before calling Stripe", async () => {
    const run = await handler("verify-payment");
    expect((await run(req({ session_id: paid.id }))).status).toBe(404);
    expect(state.stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });
  it("expires checkout if the order cannot be saved", async () => {
    state.stripe.checkout.sessions.create.mockResolvedValue({
      ...paid,
      url: "https://checkout.stripe.com/test",
    });
    state.resolve = () => ({ data: null, error: { message: "write failed" } });
    expect(
      (
        await (
          await handler("create-payment")
        )(
          req(
            { pack: 2 },
            { authorization: "Bearer user", origin: "https://intrvue.ai" },
          ),
        )
      ).status,
    ).toBe(500);
    expect(state.stripe.checkout.sessions.expire).toHaveBeenCalledWith(paid.id);
  });
  it("requires signatures and returns failure when settlement needs retry", async () => {
    const run = await handler("stripe-webhook");
    expect((await run(req())).status).toBe(400);
    state.stripe.webhooks.constructEventAsync.mockResolvedValue({
      id: "evt-1",
      type: "checkout.session.completed",
      data: { object: paid },
    });
    state.rpc.mockResolvedValue({
      data: null,
      error: new Error("database offline"),
    });
    expect(
      (await run(req({}, { "stripe-signature": "signature" }))).status,
    ).toBe(500);
  });
  it("handles delayed successful payments and skips unpaid completions", async () => {
    const run = await handler("stripe-webhook");
    state.stripe.webhooks.constructEventAsync.mockResolvedValue({
      id: "evt-2",
      type: "checkout.session.async_payment_succeeded",
      data: { object: paid },
    });
    state.rpc.mockResolvedValue({
      data: { ok: true, balance: 2, credits_added: 2, alreadyProcessed: false },
      error: null,
    });
    expect(
      (await run(req({}, { "stripe-signature": "signature" }))).status,
    ).toBe(200);
    expect(state.rpc).toHaveBeenCalledTimes(1);
    state.stripe.webhooks.constructEventAsync.mockResolvedValue({
      id: "evt-3",
      type: "checkout.session.completed",
      data: { object: { ...paid, payment_status: "unpaid" } },
    });
    expect(
      (await run(req({}, { "stripe-signature": "signature" }))).status,
    ).toBe(200);
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("Emails and administration", () => {
  it("rejects invalid credit operations without touching balances", async () => {
    const run = await handler("admin-credit-management");
    for (const body of [
      { userId: session.user_id, action: "multiply", amount: 1 },
      { userId: session.user_id, action: "add", amount: "2" },
      { userId: session.user_id, action: "add", amount: 0.5 },
    ]) {
      expect((await run(req(body))).status).toBe(400);
    }
    expect(state.queries).toHaveLength(0);
  });
  it("auth email uses configured auth credentials and reports provider failure", async () => {
    state.email.mockResolvedValue({
      data: null,
      error: { message: "rejected" },
    } as any);
    const response = await (
      await handler("send-auth-email")
    )(
      req({
        email: state.user!.email,
        type: "reset",
        resetUrl: "https://intrvue.ai/reset",
      }),
    );
    expect(response.status).toBe(502);
  });
  it("does not send mail to a different account", async () => {
    expect(
      (
        await (
          await handler("send-email")
        )(req({ to: "other@example.test", subject: "Test", html: "Hello" }))
      ).status,
    ).toBe(403);
    expect(state.email).not.toHaveBeenCalled();
  });
});

describe("Feedback", () => {
  const body = {
    userId: session.user_id,
    sessionId: "client-session",
    sessionReference: "S1",
    interviewType: "medicine-mmi",
    transcription:
      "Student: I would first listen carefully to the patient, acknowledge their concerns, and ask the appropriate team member for help.\nInterviewer: Thank you.",
  };
  it("does not spend on models when transcript persistence fails", async () => {
    state.resolve = (query) => ({
      data: query.operation === "select" ? session : null,
      count: 0,
      error: query.operation === "update" ? { message: "write failure" } : null,
    });
    const response = await (
      await handler("generate-interview-feedback")
    )(req(body));
    expect(response.status).toBe(503);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("rejects an unowned session and a mismatched rubric before calling a model", async () => {
    const run = await handler("generate-interview-feedback");
    expect((await run(req(body))).status).toBe(404);
    state.resolve = (q) => ({
      data:
        q.table === "interview_sessions"
          ? { ...session, interview_type: "maths-interview" }
          : null,
      count: 0,
      error: null,
    });
    expect((await run(req(body))).status).toBe(400);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("does not grant access to pilot scoring through the feedback endpoint", async () => {
    state.resolve = (q) => ({
      data:
        q.table === "interview_sessions"
          ? { ...session, interview_type: "medicine-oxford-pilot" }
          : null,
      count: 0,
      error: null,
    });
    state.rpc.mockResolvedValue({ data: false, error: null });
    const run = await handler("generate-interview-feedback");
    expect(
      (await run(req({ ...body, interviewType: "medicine-oxford-pilot" })))
        .status,
    ).toBe(403);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("preserves the transcript but never invents a score when model output is invalid", async () => {
    state.resolve = (q) => ({
      data: q.table === "interview_sessions" ? session : null,
      count: 0,
      error: null,
    });
    state.fetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "not valid assessment JSON" } }],
          }),
        ),
    );
    const response = await (
      await handler("generate-interview-feedback")
    )(req(body));
    expect(response.status).toBe(502);
    expect(
      state.queries.some(
        (q) =>
          q.table === "interview_sessions" &&
          q.operation === "update" &&
          (q.value as any).transcript === body.transcription,
      ),
    ).toBe(true);
    expect(
      state.queries.some(
        (q) => q.table === "feedback" && q.operation === "insert",
      ),
    ).toBe(false);
    const requests = state.fetch.mock.calls.map(([, options]) =>
      JSON.parse(options.body),
    );
    expect(
      requests.some((x) =>
        x.messages?.[0]?.content.includes(
          "a medical school admissions practice interview",
        ),
      ),
    ).toBe(true);
    expect(
      requests.some((x) =>
        x.messages?.[0]?.content.includes("an 11+ medicine"),
      ),
    ).toBe(false);
  });
  it.each(["maths-interview", "11-plus", "11-plus-v2", "medicine-mmi"])(
    "preserves successful %s feedback",
    async (interviewType) => {
      state.resolve = (q) => ({
        data:
          q.table === "interview_sessions"
            ? { ...session, interview_type: interviewType }
            : q.table === "feedback" && q.operation === "insert"
              ? { id: "feedback-id" }
              : null,
        count: 0,
        error: null,
      });
      const feedback = {
        pattern_recognition_score: 3,
        logical_deduction_score: 3,
        mathematical_logic_score: 3,
        clarity_of_thought_score: 3,
        personal_insight_score: 3,
        reasoning_score: 3,
        extracurricular_score: 3,
        current_awareness_score: 3,
        detailed_feedback: {
          overall: "A specific reflection on the answer",
          band_assessment: "Practice assessment",
          personal_insight: "Evidence",
          reasoning: "Evidence",
          extracurricular: "Evidence",
          current_awareness: "Evidence",
        },
        annotations: [],
      };
      state.fetch.mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify(feedback) } }],
            }),
          ),
      );
      const response = await (
        await handler("generate-interview-feedback")
      )(req({ ...body, interviewType }));
      expect(response.status).toBe(200);
      expect((await response.json()).total_score).toBe(12);
      expect(
        state.queries.find(
          (q) => q.table === "feedback" && q.operation === "insert",
        )?.value,
      ).toEqual(
        expect.objectContaining({
          interview_type: interviewType,
          total_score: 12,
        }),
      );
    },
  );
});

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  url: string;
  onopen: any;
  onclose: any;
  onmessage: any;
  onerror: any;
  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.();
  }
}
function socketSetup() {
  vi.useFakeTimers();
  FakeSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeSocket);
  const client = new FakeSocket("browser");
  client.readyState = 1;
  (globalThis as any).Deno.upgradeWebSocket.mockReturnValue({
    socket: client,
    response: new Response("upgrade"),
  });
  return client;
}
const socketRequest = () =>
  new Request("https://local.test/?token=user-token", {
    headers: { upgrade: "websocket" },
  });
describe("Speech relays", () => {
  it("waits for Speechmatics recognition readiness and counts buffered frames", async () => {
    const client = socketSetup();
    state.fetch.mockImplementation(
      async () =>
        new Response(JSON.stringify({ token: "temporary", key_value: "jwt" })),
    );
    await (
      await handler("stt-bakeoff-relay")
    )(socketRequest());
    client.onmessage({ data: JSON.stringify({ type: "start" }) });
    const audio = new ArrayBuffer(100);
    client.onmessage({ data: audio });
    await vi.waitFor(() => expect(FakeSocket.instances).toHaveLength(4));
    const speech = FakeSocket.instances.find((socket) =>
      socket.url.includes("speechmatics.com"),
    )!;
    speech.readyState = 1;
    speech.onopen();
    expect(speech.sent).toHaveLength(1);
    expect(JSON.parse(speech.sent[0] as string).message).toBe(
      "StartRecognition",
    );
    speech.onmessage({
      data: JSON.stringify({ message: "RecognitionStarted" }),
    });
    expect(speech.sent[1]).toBe(audio);
    client.onmessage({ data: JSON.stringify({ type: "stop" }) });
    expect(JSON.parse(speech.sent[2] as string)).toEqual({
      message: "EndOfStream",
      last_seq_no: 1,
    });
    client.close();
  });
  it("bounds queued audio and can drain and reuse the buffer", () => {
    const buffer = new AudioBuffer(8);
    expect(buffer.push(new Uint8Array(8))).toBe(true);
    expect(buffer.push("x")).toBe(false);
    const output: unknown[] = [];
    buffer.drain((x) => output.push(x));
    expect(output).toHaveLength(1);
    expect(buffer.push("hello")).toBe(true);
    buffer.clear();
    expect(buffer.push(new ArrayBuffer(8))).toBe(true);
  });
  it.each(["deepgram-relay", "stt-bakeoff-relay"])(
    "%s denies invalid users before upgrading",
    async (name) => {
      state.user = null;
      expect((await (await handler(name))(socketRequest())).status).toBe(401);
      expect((globalThis as any).Deno.upgradeWebSocket).not.toHaveBeenCalled();
    },
  );
  it("Deepgram closes both sides when queued audio exceeds its bound", async () => {
    const client = socketSetup();
    await (
      await handler("deepgram-relay")
    )(socketRequest());
    client.onopen();
    const provider = FakeSocket.instances[1];
    client.onmessage({ data: new ArrayBuffer(320001) });
    expect(provider.readyState).toBe(3);
    expect(client.readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not start late or repeated speech-provider connections after stop", async () => {
    const client = socketSetup();
    let release!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    state.fetch.mockImplementation(() => pending);
    await (
      await handler("stt-bakeoff-relay")
    )(socketRequest());
    client.onmessage({ data: JSON.stringify({ type: "start" }) });
    client.onmessage({ data: JSON.stringify({ type: "start" }) });
    expect(state.fetch).toHaveBeenCalledTimes(2);
    client.onmessage({ data: JSON.stringify({ type: "stop" }) });
    release(
      new Response(JSON.stringify({ token: "temporary", key_value: "jwt" })),
    );
    await Promise.resolve();
    await Promise.resolve();
    client.close();
    expect(FakeSocket.instances).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
    expect(state.fetch.mock.calls[0][0]).not.toContain("assembly-test");
  });
});

describe("Deployment inventory", () => {
  it("explicitly configures every function and preserves external callback authentication modes", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const directories = readdirSync("supabase/functions", {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"));
    expect(directories).toHaveLength(13);
    const external = new Set([
      "stripe-webhook",

      "deepgram-relay",
      "stt-bakeoff-relay",
    ]);
    for (const entry of directories) {
      const block = config.split(`[functions.${entry.name}]`)[1]?.split("[")[0];
      expect(block, entry.name).toBeDefined();
      expect(block).toMatch(
        new RegExp(
          `verify_jwt\\s*=\\s*${external.has(entry.name) ? "false" : "true"}`,
        ),
      );
    }
  });
});
