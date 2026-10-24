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
  "creator-programme",
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
  it.each([{action:'start',mode:'practice'},{action:'switch_topic',mode:'mock'}])('keeps the general MMI mock as a complete circuit: %j', async body => {
    state.resolve = () => ({data:{...session,interview_type:'medicine-mmi-practice'},error:null});
    const response = await (await handler('interview-brain'))(req({sessionId:'S1',...body}));
    expect(response.status).toBe(400);
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.queries.some(q=>q.table==='interview_sessions'&&q.operation==='update')).toBe(false);
  });
  it("returns a retryable failure without committing a Medicine answer when the model is unavailable", async () => {
    const engineState = {
      subject: "medicine", mode: "mock", difficulty: 2, questionIndex: 0,
      targetQuestions: 5, done: false, seed: 1, askedIds: ["M1"],
      currentStudentTurns: [], evidence: [], transcript: [],
      current: { id: "M1", subject: "medicine", difficulty: 2, topic: "motivation-reflection", question: "Why medicine?", answer: "Reflect on experience." },
    };
    state.resolve = q => ({ data: q.table === "interview_sessions" ? { ...session, engine_state: engineState } : null, error: null });
    state.fetch.mockImplementation(async () => new Response("", { status: 429, headers: { "retry-after": "60" } }));
    const response = await (await handler("interview-brain"))(req({ sessionId: "S1", action: "answer", studentText: "Volunteering showed me the importance of listening.", turnId: "retry-this-answer" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("retry the same turn");
    expect(state.queries.some(q => q.table === "interview_sessions" && q.operation === "update")).toBe(false);
    expect(engineState.currentStudentTurns).toEqual([]);
  });
  it.each(["medicine-mmi", "medicine-mmi-manchester", "medicine-mmi-practice", "medicine-imperial-pilot"])("exposes a complete public roleplay brief in %s while keeping actor instructions private", async interviewType => {
    state.resolve = () => ({ data: { ...session, interview_type: interviewType, engine_state: {
      mode: "mock", difficulty: 2, questionIndex: 0, targetQuestions: 5, done: false,
      current: { id: "RP", question: "You are joking.", topic: "roleplay-stations", answer: "PRIVATE ANSWER", roleplay: { name: "Steph", role: "a parent", applicantRole: "You are a volunteer. The pool is closed.", openingStatement: "You are joking.", hiddenFacts: [{fact:"PRIVATE FACT"}], actorStateTrajectory:"PRIVATE TRAJECTORY" } },
      lastTurn: { id: "brief-retry", say: "Here is your station." },
    } }, error: null });
    const response = await (await handler("interview-brain"))(req({sessionId:"S1",action:"repeat",turnId:"brief-retry"}));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.uiState.exercise.prompt).toContain("You are a volunteer. The pool is closed.");
    expect(result.uiState.exercise.prompt).toContain("Steph");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(state.fetch).not.toHaveBeenCalled();
  });
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
  it.each([{valid:true,personal:false},{valid:false,personal:false},{valid:true,personal:true}])('persists only permitted focused-station coaching (%j)',async ({valid,personal})=>{
    const interviewType=personal?'medicine-motivation-practice':'medicine-roleplay-practice';
    const answer='I would first listen carefully to the patient';
    const coaching={question_index:1,original_quote:valid?answer:'I diagnosed them with anxiety.',improved_answer:'What is worrying you most? I would listen before suggesting a next step.',why:'Ask an open question to understand their priorities.',structure:['Acknowledge the concern.','Explore their priorities.','Agree a next step within your role.']};
    state.resolve=q=>({data:q.table==='interview_sessions'?{...session,interview_type:interviewType,evidence:[{index:1,id:'qa-roleplay',question:personal?'What did you learn from volunteering?':'Speak to the worried person.',studentAnswer:answer}]}:q.table==='feedback'&&q.operation==='insert'?{id:'f-coach'}:null,count:0,error:null});
    const assessment={pattern_recognition_score:3,logical_deduction_score:null,mathematical_logic_score:null,clarity_of_thought_score:null,score_evidence:{pattern_recognition_score:answer},detailed_feedback:{overall:'You offered to listen.',band_assessment:'Partial',strength:'You offered support.',next_step:'Ask an open question.',answer_coaching:coaching},annotations:[]};
    state.fetch.mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(assessment)},finish_reason:'stop'}]})));
    const response=await (await handler('generate-interview-feedback'))(req({...body,interviewType}));
    expect(response.status).toBe(200);
    const stored=state.queries.find(q=>q.table==='feedback'&&q.operation==='insert')?.value as any;
    expect(stored.detailed_feedback.answer_coaching).toEqual(personal?{...coaching,original_quote:null,improved_answer:null}:valid?coaching:null);
    const request=JSON.parse(state.fetch.mock.calls[0][1].body);
    expect(request.response_format.json_schema.schema.properties.detailed_feedback.required).toContain('answer_coaching');
    expect(request.messages[0].content).toContain('Never fabricate experiences');
    if(personal){
      const fields=request.response_format.json_schema.schema.properties.detailed_feedback.properties.answer_coaching.anyOf[1].properties;
      expect(fields.improved_answer).toEqual({type:'null'});
      expect(fields.original_quote).toEqual({type:'null'});
      expect(request.messages[0].content).toContain('answer structure ONLY');
    }
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['refusal', 'truncated', 'empty'])('keeps the transcript and returns retryable errors for %s model output', async kind => {
    state.resolve = q => ({ data: q.table === 'interview_sessions' ? session : null, count: 0, error: null });
    state.fetch.mockResolvedValue(new Response(JSON.stringify({ choices: kind === 'empty' ? [] : [{ message: { content: '{}', refusal: kind === 'refusal' ? 'Unable to assess' : null }, finish_reason: kind === 'truncated' ? 'length' : 'stop' }] })));
    const response = await (await handler('generate-interview-feedback'))(req(body));
    expect(response.status).toBe(502);
    expect(state.queries.some(q => q.table === 'feedback' && q.operation === 'insert')).toBe(false);
  });
  it.each([true, false])('preserves partial scores and reports whether the assessment was saved (%s)', async saved => {
    state.resolve = q => ({ data: q.table === 'interview_sessions' ? session : q.table === 'feedback' && q.operation === 'insert' && saved ? { id: 'f1' } : null, count: 0, error: q.table === 'feedback' && q.operation === 'insert' && !saved ? { message: 'Write failed' } : null });
    const feedback = { pattern_recognition_score: 3, logical_deduction_score: null, mathematical_logic_score: null, clarity_of_thought_score: null,
      score_evidence: { pattern_recognition_score: 'I would first listen carefully to the patient' }, detailed_feedback: { overall: 'You started by listening.', band_assessment: 'Partial', strength: 'Listening.', next_step: 'Explain the next step.' }, annotations: [] };
    state.fetch.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(feedback) } }] })));
    const response = await (await handler('generate-interview-feedback'))(req(body));
    expect(response.status).toBe(saved ? 200 : 503);
    const stored = state.queries.find(q => q.table === 'feedback' && q.operation === 'insert')?.value as any;
    expect(stored.total_score).toBeNull();
    expect(stored.rating).toBeNull();
    expect(stored.scores.content__reasoning).toBe(3);
    expect(stored.scores.communication__delivery).toBeUndefined();
    expect(stored.logical_deduction_score).toBeNull();
    if (!saved) expect((await response.json()).error).toContain('assessment could not be saved');
  });
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
  it('keeps reasoning available to assessment after the candidate skips the rest of a station', async () => {
    const answer = 'I would first listen carefully to the patient';
    state.resolve = q => ({ data: q.table === 'interview_sessions' ? { ...session, evidence: [{ index:1, topic:'ethics', skipped:true, question:'What would you do?', studentAnswer:answer }] } : null, count:0, error:null });
    state.fetch.mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'{}'}}]})));
    await (await handler('generate-interview-feedback'))(req(body));
    const prompt = JSON.parse(state.fetch.mock.calls[0][1].body).messages[1].content;
    expect(prompt).toContain('Candidate moved on after answering; assess the recorded reasoning.');
    expect(prompt).toContain(`said: "${answer}"`);
  });
  it("preserves the transcript and returns a retryable feedback error during a long provider hold", async () => {
    state.resolve = q => ({ data: q.table === "interview_sessions" ? session : null, count: 0, error: null });
    state.fetch.mockImplementation(async () => new Response("", { status: 429, headers: { "retry-after": "60" } }));
    const response = await (await handler("generate-interview-feedback"))(req(body));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("transcript is saved");
    expect(state.queries.some(q => q.table === "interview_sessions" && q.operation === "update" && (q.value as any).transcript === body.transcription)).toBe(true);
    expect(state.queries.some(q => q.table === "feedback" && q.operation === "insert")).toBe(false);
  });
  it.each(["maths-interview", "11-plus", "11-plus-v2", "medicine-mmi-practice", "medicine-mmi", "medicine-mmi-manchester", "medicine-ethics-practice", "medicine-roleplay-practice", "medicine-motivation-practice", "medicine-data-practice"])(
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
        score_evidence: Object.fromEntries(['pattern_recognition_score', 'logical_deduction_score', 'mathematical_logic_score', 'clarity_of_thought_score', 'personal_insight_score', 'reasoning_score', 'extracurricular_score', 'current_awareness_score'].map(key => [key, 'I would first listen carefully to the patient'])),
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
      )(req({ ...body, interviewType, transcription: body.transcription + '\nStudent: That was fucking difficult, but I would listen and clarify.' }));
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.total_score).toBe(12);
      expect(state.fetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(state.fetch.mock.calls[0][1].body).response_format.type).toBe('json_schema');
      expect(payload.transcription).toContain('******* difficult');
      const stored = state.queries.find(q => q.table === 'feedback' && q.operation === 'insert')?.value as any;
      expect(stored.transcription).not.toContain('fucking');
      if (interviewType.startsWith('medicine-')) {
        expect(stored.scores).toHaveProperty('content__reasoning', 3);
        expect(stored.scores).toHaveProperty('communication__delivery', 3);
        expect(stored.scores).not.toHaveProperty('ethical__clinical_reasoning');
      }
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
    expect(directories).toHaveLength(15);
    const external = new Set([
      "mmi-guest-access",
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

describe("Interview Lab sessions", () => {
  const sessionRow = { ...session, interview_type: "medicine-ethics-practice" };
  const lab = (settings: unknown) => req({ sessionId: "S1", action: "start", lab: settings });
  const updates = () => state.queries.filter((q) => q.table === "interview_sessions" && q.operation === "update");
  const savedState = () => (updates()[0]?.value as { engine_state: Record<string, any> }).engine_state;
  const asAdmin = (admin: boolean) =>
    state.rpc.mockImplementation(async (name: string) => ({ data: name === "is_current_user_admin" ? admin : true, error: null }));
  const resolveWith = (draft: unknown = null) => {
    state.resolve = (q) =>
      q.table === "interview_sessions"
        ? { data: q.operation === "update" ? { id: "session-uuid" } : sessionRow, error: null }
        : q.table === "interview_lab_drafts" ? { data: draft, error: null } : { data: null, error: null };
  };

  it("refuses lab settings from anyone who is not an administrator", async () => {
    resolveWith();
    asAdmin(false);
    const response = await (await handler("interview-brain"))(lab({ version: "2026-10-09" }));
    expect(response.status).toBe(403);
    expect(updates()).toHaveLength(0);
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("replays a dated version for an administrator and records it in the session", async () => {
    resolveWith();
    asAdmin(true);
    const response = await (await handler("interview-brain"))(lab({ version: "2026-10-09" }));
    expect(response.status).toBe(200);
    expect((await response.json()).say).toMatch(/^Hello, I'm Clara, your AI practice interviewer\. We will work through one focused station\./);
    expect(savedState().lab).toEqual(expect.objectContaining({ version: "2026-10-09" }));
    expect(savedState().behaviour.medicineWelcome).toBe(false);
  });

  it("applies a founder draft loaded on the server, not from the request", async () => {
    resolveWith({ id: "22222222-2222-4222-8222-222222222222", name: "Calmer", platform: "medicine", base_version: "2026-10-20", behaviour: {}, opening_line: "Hello {name}, take a breath. Ready when you are.", closing_line: null, extra_instructions: null });
    asAdmin(true);
    const response = await (await handler("interview-brain"))(lab({ version: "2026-10-20", draftId: "22222222-2222-4222-8222-222222222222", openingLine: "forged" }));
    expect(response.status).toBe(200);
    expect((await response.json()).say).toBe("Hello, take a breath. Ready when you are.");
    expect(savedState().lab).toEqual(expect.objectContaining({ draftName: "Calmer", openingLine: "Hello {name}, take a breath. Ready when you are." }));
  });

  it.each([{ version: "1999-01-01" }, { version: 5 }, { version: "2026-10-20", draftId: "not-a-uuid" }, [], "2026-10-20"])(
    "rejects malformed lab settings %j",
    async (settings) => {
      resolveWith();
      asAdmin(true);
      const response = await (await handler("interview-brain"))(lab(settings));
      expect(response.status).toBe(400);
      expect(updates()).toHaveLength(0);
    },
  );

  it("leaves ordinary interviews on the live behaviour", async () => {
    resolveWith();
    const response = await (await handler("interview-brain"))(req({ sessionId: "S1", action: "start" }));
    expect(response.status).toBe(200);
    expect(savedState().lab).toBeUndefined();
    expect(savedState().behaviour).toBeUndefined();
  });
});

describe("Medicine credits", () => {
  const student = (charge: unknown = { ok: true, alreadyCharged: false, charged: 1, balance: 2 }) =>
    state.rpc.mockImplementation(async (name: string) => ({
      data: name === "is_current_user_admin" ? false : name === "charge_medicine_session" ? charge : true,
      error: null,
    }));
  const tokenFor = async (interviewType: string) => {
    state.resolve = (q) => ({
      data: q.table === "interview_sessions" && q.columns?.includes("interview_type") ? { ...session, interview_type: interviewType } : null,
      count: 0,
      error: null,
    });
    return (await handler("get-anam-session-token"))(req({ personaConfig: persona, sessionReference: "S1", engineDriven: true }));
  };
  const charges = () => state.rpc.mock.calls.filter(([name]) => name === "charge_medicine_session");

  it.each([
    ["medicine-roleplay-practice", 1],
    ["medicine-mmi-practice", 6],
  ])("charges %s once, on the server, before the avatar opens", async (type, cost) => {
    student();
    state.fetch.mockResolvedValue(new Response(JSON.stringify({ sessionToken: "token" })));
    expect((await tokenFor(type)).status).toBe(200);
    expect(charges()).toEqual([["charge_medicine_session", { p_session_id: session.id, p_cost: cost }]]);
  });
  it("refuses a short balance without opening an avatar session", async () => {
    student({ ok: false, reason: "insufficient", balance: 0, cost: 6 });
    const response = await tokenFor("medicine-mmi-practice");
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "medicine_credits_required", cost: 6, balance: 0 });
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("keeps Ethics & judgement free and never charges administrators or 11+ interviews", async () => {
    state.fetch.mockImplementation(async () => new Response(JSON.stringify({ sessionToken: "token" })));
    student();
    expect((await tokenFor("medicine-ethics-practice")).status).toBe(200);
    expect((await tokenFor("11-plus")).status).toBe(200);
    state.rpc.mockImplementation(async () => ({ data: true, error: null }));
    expect((await tokenFor("medicine-mmi-practice")).status).toBe(200);
    expect(charges()).toEqual([]);
  });
  it("refuses retired Medicine formats to paying users", async () => {
    student();
    expect((await tokenFor("medicine-mmi")).status).toBe(403);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("ends a freshly charged session when the avatar service fails, so the database refunds it", async () => {
    student();
    state.fetch.mockResolvedValue(new Response("down", { status: 503 }));
    expect((await tokenFor("medicine-data-practice")).status).toBe(500);
    const ended = state.queries.find((q) => q.table === "interview_sessions" && q.operation === "update" && (q.value as any).status === "error");
    expect(ended?.filters).toEqual(expect.arrayContaining([["eq", ["id", session.id]], ["is", ["engine_state", null]]]));
  });
  it("does not end a session that was already charged by an earlier request", async () => {
    student({ ok: true, alreadyCharged: true, charged: 1, balance: 0 });
    state.fetch.mockResolvedValue(new Response("down", { status: 503 }));
    await tokenFor("medicine-data-practice");
    expect(state.queries.some((q) => q.table === "interview_sessions" && q.operation === "update" && (q.value as any).status === "error")).toBe(false);
  });

  const brainStart = async (type: string, charge: unknown) => {
    state.resolve = (q) => ({
      data: q.table === "interview_sessions" ? { ...session, interview_type: type } : q.table === "medicine_credit_ledger" ? charge : null,
      error: null,
    });
    return (await handler("interview-brain"))(req({ sessionId: "S1", action: "start" }));
  };
  it.each([
    ["no charge", null],
    ["a refunded charge", { interview_type: "medicine-data-practice", refunded_at: "2026-10-22T10:00:00Z" }],
    ["a charge for a cheaper interview", { interview_type: "medicine-roleplay-practice", refunded_at: null }],
  ])("the brain will not start a paid interview with %s", async (_label, charge) => {
    student();
    const response = await brainStart("medicine-data-practice", charge);
    expect(response.status).toBe(402);
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.queries.some((q) => q.table === "interview_sessions" && q.operation === "update")).toBe(false);
  });

  it("sells Medicine packs at server prices into the Medicine balance", async () => {
    state.stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_med", url: "https://checkout.stripe.com/med" });
    const run = await handler("create-payment");
    const buy = (body: unknown) => run(req(body, { authorization: "Bearer user", origin: "https://mmipractice.co.uk" }));
    expect((await buy({ platform: "medicine", pack: "full" })).status).toBe(200);
    const sent = state.stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sent.line_items[0].price_data.unit_amount).toBe(3499);
    expect(sent.metadata).toEqual({ credits: "6", platform: "medicine" });
    const order = state.queries.find((q) => q.table === "orders" && q.operation === "insert")!.value as any;
    expect(order).toMatchObject({ amount: 3499, credits_purchased: 6, platform: "medicine" });
    expect((await buy({ platform: "medicine", pack: "single" })).status).toBe(200);
    expect(state.stripe.checkout.sessions.create.mock.calls[1][0].line_items[0].price_data.unit_amount).toBe(699);
    for (const bad of [{ platform: "medicine", pack: 2 }, { platform: "medicine", pack: "constructor" }, { platform: "chess", pack: 2 }, { pack: "full" }])
      expect((await buy(bad)).status).toBe(400);
    expect(state.stripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
  });
  it("keeps 11+ packs and prices unchanged", async () => {
    state.stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_11", url: "https://checkout.stripe.com/11" });
    expect((await (await handler("create-payment"))(req({ pack: 3 }, { authorization: "Bearer user", origin: "https://intrvue.ai" }))).status).toBe(200);
    expect(state.stripe.checkout.sessions.create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(2999);
    expect(state.queries.find((q) => q.table === "orders")!.value).toMatchObject({ credits_purchased: 3, platform: "11plus" });
  });
  it("adjusts the Medicine balance separately for administrators", async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data: name === "adjust_medicine_credits_atomic" ? { previous_balance: 0, new_balance: 1 } : true,
      error: null,
    }));
    const response = await (await handler("admin-credit-management"))(
      req({ userId: session.user_id, action: "add", amount: 1, platform: "medicine", note: "Dropped connection" }),
    );
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("adjust_medicine_credits_atomic", { p_user_id: session.user_id, p_action: "add", p_amount: 1, p_note: "Dropped connection" });
    expect(state.rpc).not.toHaveBeenCalledWith("adjust_credits_atomic", expect.anything());
    expect((await (await handler("admin-credit-management"))(req({ userId: session.user_id, action: "add", amount: 1, platform: "chess" }))).status).toBe(400);
  });
});

describe("Creator programme", () => {
  const creatorRow = { id: "c-1", email: "sam@example.test", name: "Sam", status: "active", stripe_account_id: null, payout_status: "not_connected" };
  const run = async (body: unknown, headers: Record<string, string> = { authorization: "Bearer user-token", origin: "https://mmipractice.co.uk" }) =>
    (await handler("creator-programme"))(req(body, headers));
  const asCreator = (row: unknown = creatorRow) => {
    state.resolve = (q) => ({ data: q.table === "creators" && q.operation === "select" ? row : null, error: null });
  };
  const updates = () => state.queries.filter((q) => q.table === "creators" && q.operation === "update");

  it("refuses accounts that are not creators", async () => {
    asCreator(null);
    expect((await run({ action: "connect" })).status).toBe(403);
    expect(state.stripe.accounts.create).not.toHaveBeenCalled();
  });
  it("creates one Express account per creator and returns Stripe's hosted onboarding page", async () => {
    asCreator();
    state.stripe.accounts.create.mockResolvedValue({ id: "acct_123" });
    state.stripe.accountLinks.create.mockResolvedValue({ url: "https://connect.stripe.com/setup/e/acct_123" });
    const response = await run({ action: "connect" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://connect.stripe.com/setup/e/acct_123" });
    expect(state.stripe.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "express", country: "GB", email: "sam@example.test", capabilities: { transfers: { requested: true } } }),
      { idempotencyKey: "creator-account-c-1" },
    );
    expect(updates()[0].value).toEqual({ stripe_account_id: "acct_123", payout_status: "pending" });
    expect(state.stripe.accountLinks.create).toHaveBeenCalledWith(expect.objectContaining({
      account: "acct_123",
      return_url: "https://mmipractice.co.uk/creator?stripe=return",
      refresh_url: "https://mmipractice.co.uk/creator?stripe=refresh",
    }));
  });
  it("reuses an existing account and never returns to an unknown origin", async () => {
    asCreator({ ...creatorRow, stripe_account_id: "acct_123", payout_status: "pending" });
    state.stripe.accountLinks.create.mockResolvedValue({ url: "https://connect.stripe.com/x" });
    await run({ action: "connect" }, { authorization: "Bearer user-token", origin: "https://evil.example" });
    expect(state.stripe.accounts.create).not.toHaveBeenCalled();
    expect(state.stripe.accountLinks.create.mock.calls[0][0].return_url).toBe("https://intrvue.ai/creator?stripe=return");
  });
  it("marks payouts ready only when Stripe says the account can be paid", async () => {
    asCreator({ ...creatorRow, stripe_account_id: "acct_123", payout_status: "pending" });
    state.stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: false, details_submitted: true, requirements: { currently_due: ["external_account"] } });
    expect(await (await run({ action: "status" })).json()).toEqual({ payoutStatus: "pending", due: 1 });
    expect(updates()).toHaveLength(0);
    state.stripe.accounts.retrieve.mockResolvedValue({ payouts_enabled: true, details_submitted: true, requirements: { currently_due: [] } });
    expect(await (await run({ action: "status" })).json()).toEqual({ payoutStatus: "verified", due: 0 });
    expect(updates()[0].value).toEqual({ payout_status: "verified" });
  });
  it("opens the Stripe dashboard only for verified accounts", async () => {
    asCreator({ ...creatorRow, stripe_account_id: "acct_123", payout_status: "pending" });
    expect((await run({ action: "stripe_dashboard" })).status).toBe(409);
    asCreator({ ...creatorRow, stripe_account_id: "acct_123", payout_status: "verified" });
    state.stripe.accounts.createLoginLink.mockResolvedValue({ url: "https://connect.stripe.com/express/x" });
    expect(await (await run({ action: "stripe_dashboard" })).json()).toEqual({ url: "https://connect.stripe.com/express/x" });
  });

  const payoutRpc = (started: unknown) => state.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_admin" ? true : name === "begin_creator_payout" ? started : null,
    error: null,
  }));
  const payout = { ok: true, resumed: false, payoutId: "p-1", amountPence: 630, destination: "acct_123" };
  const creatorId = "22222222-2222-4222-8222-222222222222";
  it("lets only administrators pay creators", async () => {
    state.rpc.mockImplementation(async () => ({ data: false, error: null }));
    expect((await run({ action: "payout", creatorId })).status).toBe(403);
    expect(state.stripe.transfers.create).not.toHaveBeenCalled();
  });
  it("transfers ready earnings once, keyed by the payout", async () => {
    payoutRpc(payout);
    state.stripe.transfers.create.mockResolvedValue({ id: "tr_1" });
    const response = await run({ action: "payout", creatorId });
    expect(await response.json()).toEqual({ ok: true, amountPence: 630, transferId: "tr_1", resumed: false });
    expect(state.stripe.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 630, currency: "gbp", destination: "acct_123" }),
      { idempotencyKey: "creator-payout-p-1" },
    );
    expect(state.rpc).toHaveBeenCalledWith("finish_creator_payout", { p_payout_id: "p-1", p_transfer_id: "tr_1", p_failure: null });
  });
  it("explains when nothing can be paid yet", async () => {
    payoutRpc({ ok: false, reason: "nothing_ready" });
    const response = await run({ action: "payout", creatorId });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("30 days");
    expect(state.stripe.transfers.create).not.toHaveBeenCalled();
  });
  it("releases earnings when Stripe declines, but keeps them reserved on a network failure", async () => {
    payoutRpc(payout);
    state.stripe.transfers.create.mockRejectedValue(Object.assign(new Error("Insufficient funds in Stripe balance"), { type: "StripeInvalidRequestError" }));
    expect((await run({ action: "payout", creatorId })).status).toBe(402);
    expect(state.rpc).toHaveBeenCalledWith("finish_creator_payout", { p_payout_id: "p-1", p_transfer_id: null, p_failure: "Insufficient funds in Stripe balance" });
    state.rpc.mockClear();
    payoutRpc(payout);
    state.stripe.transfers.create.mockRejectedValue(Object.assign(new Error("socket hang up"), { type: "StripeConnectionError" }));
    expect((await run({ action: "payout", creatorId })).status).toBe(500);
    expect(state.rpc).not.toHaveBeenCalledWith("finish_creator_payout", expect.anything());
  });

  it("applies a referred customer's first-purchase discount at checkout", async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data: name === "referral_offer_for" ? { linkId: "l-1", creator: "Sam", discountPercent: 10 } : true,
      error: null,
    }));
    state.stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_ref", url: "https://checkout.stripe.com/ref" });
    const checkout = await handler("create-payment");
    expect((await checkout(req({ platform: "medicine", pack: "full" }, { authorization: "Bearer user", origin: "https://mmipractice.co.uk" }))).status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("referral_offer_for", { p_user_id: session.user_id, p_platform: "medicine" });
    const sent = state.stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sent.line_items[0].price_data.unit_amount).toBe(3149);
    expect(sent.line_items[0].price_data.product_data.description).toContain("10% off your first purchase");
    expect(sent.metadata).toEqual({ credits: "6", platform: "medicine", discount_pence: "350" });
    expect(state.queries.find((q) => q.table === "orders")!.value).toMatchObject({
      amount: 3149,
      metadata: { source: "checkout", list_price_pence: 3499, discount_pence: 350, referral_link_id: "l-1" },
    });
  });
  it("charges the list price when the referral lookup fails", async () => {
    state.rpc.mockImplementation(async (name: string) => ({ data: null, error: name === "referral_offer_for" ? { message: "offline" } : null }));
    state.stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_plain", url: "https://checkout.stripe.com/plain" });
    const checkout = await handler("create-payment");
    expect((await checkout(req({ pack: 3 }, { authorization: "Bearer user", origin: "https://intrvue.ai" }))).status).toBe(200);
    expect(state.stripe.checkout.sessions.create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(2999);
  });
});
