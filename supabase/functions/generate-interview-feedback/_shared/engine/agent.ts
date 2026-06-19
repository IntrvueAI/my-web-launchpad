/**
 * LLM-driven interview brain.
 *
 * Unlike the legacy state machine (loop.ts), here the LLM drives the WHOLE conversation — every word
 * Clara speaks is the model responding in context, so it feels like a real tutor rather than a
 * script. The server still owns the question bank (answers never reach the client) and the evidence
 * log: the model pulls problems and records how the student did via tool calls, which keeps the
 * scored "Questions" review and the /20 feedback intact.
 *
 * Dependency-free except for the injected chat function, so it runs identically in the edge function
 * and in unit tests (with a fake chat).
 */
import type { BankQuestion, Difficulty, Evidence, Mode, Outcome } from './types.ts';
import type { SubjectPack } from '../subjects/types.ts';
import { selectQuestion } from '../bank/select.ts';
import { nextDifficulty } from './adapt.ts';
import { makeEvidence } from './evidence.ts';
import { CORE_PRINCIPLES, CORE_SPEAKING_STYLE } from './core.ts';

// ---- Chat LLM interface (a small slice of OpenAI's chat+tools API) ----

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: RawToolCall[];
  tool_call_id?: string;
  name?: string;
}
export interface RawToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
export interface ParsedToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}
export interface ChatResult {
  content: string;
  toolCalls: ParsedToolCall[];
  raw: RawToolCall[];
}
export type ChatComplete = (args: { messages: ChatMessage[]; tools: any[] }) => Promise<ChatResult>;

// ---- Agent state (persisted to interview_sessions.engine_state) ----

export interface ConvTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface AgentState {
  subject: string;
  mode: Mode;
  currentTopic?: string;
  difficulty: Difficulty;
  askedIds: string[];
  current: BankQuestion | null;
  currentStudentTurns: string[];
  evidence: Evidence[];
  transcript: ConvTurn[];
  questionIndex: number;
  targetQuestions: number;
  seed: number;
  done: boolean;
}

export interface AgentDeps {
  bank: BankQuestion[];
  pack: SubjectPack;
  chat: ChatComplete;
}

export interface AgentRequest {
  action: 'start' | 'answer' | 'skip' | 'switch_topic' | 'repeat' | 'end';
  studentText?: string;
  mode?: Mode;
  topic?: string;
}

export interface AgentResult {
  say: string;
  state: AgentState;
  done: boolean;
}

export function initAgentState(args: {
  subject: string;
  mode: Mode;
  topic?: string;
  pack: SubjectPack;
  seed?: number;
}): AgentState {
  return {
    subject: args.subject,
    mode: args.mode,
    currentTopic: args.mode === 'practice' ? args.topic : undefined,
    difficulty: args.pack.startDifficulty,
    askedIds: [],
    current: null,
    currentStudentTurns: [],
    evidence: [],
    transcript: [],
    questionIndex: 0,
    targetQuestions: args.pack.mockTargetQuestions,
    seed: args.seed ?? Math.floor(Math.random() * 2 ** 31),
    done: false,
  };
}

// ---- Tools the model uses to drive the bank + review ----

const VALID_OUTCOMES = new Set<Outcome>(['correct_method', 'correct_no_method', 'incorrect', 'stuck', 'skipped']);

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'next_problem',
      description:
        'Record how the student did on the problem currently on the table (if any), then get the next problem to ask. ' +
        'Call this after the warm-up to get the first problem, and again each time you are ready to move on. ' +
        'Omit the outcome fields on the very first call (no problem is on the table yet).',
      parameters: {
        type: 'object',
        properties: {
          outcome: {
            type: 'string',
            enum: ['correct_method', 'correct_no_method', 'incorrect', 'stuck', 'skipped'],
            description: 'How the student did on the problem currently on the table.',
          },
          method_quality: { type: 'string', enum: ['sound', 'partial', 'none', 'unknown'] },
          band: { type: 'string', enum: ['strong', 'developing', 'weak'], description: 'Reasoning band from the rubric, if one was provided.' },
          hints_given: { type: 'integer', description: 'How many hints you gave on the problem just finished (a key signal — always report it).' },
          note: { type: 'string', description: 'One short note on what they did or where they slipped.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish_interview',
      description: 'End the interview after your warm closing words. Optionally record the final problem first.',
      parameters: {
        type: 'object',
        properties: {
          outcome: { type: 'string', enum: ['correct_method', 'correct_no_method', 'incorrect', 'stuck', 'skipped'] },
          method_quality: { type: 'string', enum: ['sound', 'partial', 'none', 'unknown'] },
          note: { type: 'string' },
        },
        required: [],
      },
    },
  },
];

function topicLabel(pack: SubjectPack, id?: string): string {
  return pack.topics.find((t) => t.id === id)?.label ?? 'a new topic';
}

/**
 * Render the current problem + any authored 6-part guidance into the system prompt, so Clara
 * probes, hints, and scores from the bank content rather than improvising. All parts are optional.
 */
function renderCurrentProblem(q: BankQuestion | null): string {
  if (!q) return 'No problem is on the table yet.';
  const out: string[] = [
    `The problem currently on the table (read it verbatim): "${q.question}"`,
    `Its final answer is PRIVATE — never say it: ${q.answer}${q.rubric?.finalAnswerNote ? ` (${q.rubric.finalAnswerNote})` : ''}.`,
  ];
  if (q.modelReasoningPath) out.push(`How a strong candidate thinks it through (your gold standard, do not read aloud): ${q.modelReasoningPath}`);
  if (q.rubric) {
    out.push(
      `Score their reasoning against this rubric — Strong: ${q.rubric.strong} · Developing: ${q.rubric.developing} · Weak: ${q.rubric.weak}.`,
    );
  }
  if (q.commonMistakes?.length) {
    out.push('Watch for these mistakes: ' + q.commonMistakes.map((m) => `${m.mistake} (reveals: ${m.reveals})`).join('; ') + '.');
  }
  if (q.liveProbes?.length) {
    out.push('Use these follow-up probes when useful (one at a time): ' + q.liveProbes.map((p) => `"${p.probe}"`).join(' / ') + '.');
  }
  if (q.hints?.length) {
    out.push(
      'If they are genuinely stuck, use THIS hint ladder in order, one short hint per turn (never skip to the last one): ' +
        q.hints.map((h, i) => `(${i + 1}) ${h}`).join(' '),
    );
  }
  return out.join('\n');
}

/** The system prompt is where the tutoring quality lives — persona + voice + how to run the session. */
export function buildSystemPrompt(pack: SubjectPack, state: AgentState): string {
  const mock = state.mode === 'mock';
  const lines = [
    pack.persona,
    '',
    'HOW YOU TALK — THE MOST IMPORTANT RULE:',
    'You are a real teacher SPEAKING OUT LOUD to a 10–11 year old, not a chatbot writing text.',
    '- Keep EVERY reply to one or two short sentences. Never a paragraph. Never a list. Aim for under about 25 words.',
    '- Say one useful thing, then stop and let the child talk. A single short sentence is often perfect.',
    '- Warm, natural, a little informal. Use contractions ("let\'s", "you\'ve", "that\'s").',
    '- Do NOT summarise what they just said back to them. Do NOT open with "Great question", "Certainly", "Of course" or similar. Do NOT explain more than they need.',
    '- Good examples: "Nice one — how did you work that out?"  ·  "Okay, what\'s seven times eight?"  ·  "Hmm, not quite. What could we try first?"',
    '- Bad example (too long, too written): a multi-sentence paragraph that explains everything at once.',
    '',
    CORE_PRINCIPLES,
    '',
    CORE_SPEAKING_STYLE,
    pack.speakingNotes ? pack.speakingNotes : '',
    pack.guardrails ? '\nGUARDRAILS:\n' + pack.guardrails : '',
    pack.scoringPhilosophy ? '\nHOW TO JUDGE AND SCORE:\n' + pack.scoringPhilosophy : '',
    '',
    `How to run this ${mock ? 'mock interview' : 'practice session'}:`,
    `- This is a spoken ${pack.subject} mini-interview for an 11+ candidate (about 10–11 years old).`,
    '- STAY ON THE INTERVIEW. If the child tries to chat about something unrelated (football, oranges, what you had for lunch — anything off-topic), give a warm one-line acknowledgement and steer straight back to the current question, e.g. "Ha, we can chat about that after — let\'s finish this one first." Do not get drawn into unrelated conversation, do not answer general-knowledge questions, and never let them talk the interview off course. Your job is this interview only.',
    '- Begin with a warm greeting and ONE light warm-up question to settle nerves. Do not ask a maths problem yet.',
    '- The authored question bank is your PRIMARY material — your lesson notes. Always reach for it first: ask only problems you get from next_problem (never invent your own puzzles), and never reveal or change a problem\'s answer. For hints, probes and explanations, lean on each problem\'s authored guidance (the hint ladder, the live probes, the model reasoning path) as your first port of call.',
    '- But you are a real, intelligent tutor — NOT a script-reader. Put everything in your own natural, spoken words, and when a child says something unexpected, asks a tangent, or needs help the notes do not quite cover, use your own judgement to guide them well. Prefer the document; think for yourself and improvise warmly when it runs out. The notes are a tool you pull from, not lines you recite.',
    '- To get each problem, call the tool next_problem. It returns the problem text and its answer plus its authored guidance. The answer is for YOUR eyes only — NEVER say it or confirm/deny their guess by stating it. Read the problem itself clearly and accurately, but everything around it is your own warm conversation.',
    '- Ask ONE problem at a time, then listen. Encourage them to think out loud and explain their method. Praise the method, not just the answer.',
    '- IF THEY ARE RIGHT AND HAVE EXPLAINED THEIR WORKING: just affirm it warmly and briefly ("That\'s right — lovely working") and move straight on to the next problem. Do NOT keep probing, re-explaining, summarising, or padding when their reasoning is already clear and correct. Only probe "how did you get that?" when they gave an answer with NO working (so you can tell it wasn\'t a guess).',
    '- PRODUCTIVE STRUGGLE — do not hand out hints, methods, or the answer too early. The FIRST time a child goes quiet, says "I don\'t know", or even directly ASKS for a hint, do NOT give one yet. Reassure them and insist they have a real go first — "Have a try first, even a rough guess; what\'s your first thought?" Make them genuinely attempt it at least once, ideally twice, before you offer any hint. Never give away the method just because they asked.',
    '- Only once they have genuinely had a go and are STILL stuck (usually after a second or third attempt) do you start hinting. Then behave like a real tutor — never hand over the answer, help in SMALL steps, ONE short nudge per turn (do not list all the steps at once): first check they understood the question; next name the method or strategy; and if still stuck, walk them through just the first step and ask them to take the next. Give as many escalating hints as they need, one at a time, and never give up on them.',
    '- Move on only once they have made a real attempt, or you have genuinely helped them work it through. When you move on, call next_problem and pass your honest judgement of the problem they just finished (outcome, method_quality, the rubric band if one was given, and a short note) so it is recorded for their feedback.',
    mock
      ? `- Aim for about ${state.targetQuestions} problems in total, then give a warm closing and call finish_interview. If next_problem tells you there are no more problems, wrap up.`
      : '- Keep going on the chosen topic. The student may switch topics or end whenever they like.',
    '- If the student asks to skip, acknowledge kindly and call next_problem with outcome "skipped".',
    '- Keep every turn to one or two short sentences — brevity matters more than completeness, since you can always continue next turn. The student should do most of the talking.',
    '- To finish: thank them warmly, give one genuine, specific positive, and tell them to end the interview to see their feedback, then call finish_interview.',
    '',
    `Progress so far: ${state.questionIndex} problem(s) done${mock ? ` of about ${state.targetQuestions}` : ''}. Current difficulty: ${state.difficulty}.`,
    renderCurrentProblem(state.current),
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function logEvidence(state: AgentState, args: { outcome?: string; method_quality?: string; band?: string; hints_given?: number; note?: string }) {
  if (!state.current) return;
  const outcome = (VALID_OUTCOMES.has(args.outcome as Outcome) ? args.outcome : 'stuck') as Outcome;
  const methodQuality = (['sound', 'partial', 'none', 'unknown'].includes(args.method_quality as string)
    ? args.method_quality
    : 'unknown') as Evidence['methodQuality'];
  const band = (['strong', 'developing', 'weak'].includes(args.band as string) ? args.band : undefined) as Evidence['band'];
  const hintsUsed = Number.isFinite(args.hints_given) ? Math.max(0, Math.round(args.hints_given as number)) : 0;
  state.evidence.push(
    makeEvidence(state.evidence.length + 1, state.current, state.currentStudentTurns.join(' ').trim(), hintsUsed, {
      outcome,
      methodQuality,
      band,
      notes: args.note || '',
    }),
  );
  state.questionIndex = state.evidence.length;
  if (state.mode === 'mock') {
    state.difficulty = nextDifficulty(state.difficulty, outcome, 0) as Difficulty;
  }
  state.current = null;
  state.currentStudentTurns = [];
}

function executeTool(call: ParsedToolCall, state: AgentState, deps: AgentDeps): Record<string, any> {
  if (call.name === 'finish_interview') {
    if (call.args.outcome && state.current) logEvidence(state, call.args);
    state.done = true;
    return { ok: true };
  }
  // next_problem
  if (call.args.outcome && state.current) logEvidence(state, call.args);

  if (state.mode === 'mock' && state.questionIndex >= state.targetQuestions) {
    return { no_more_problems: true, message: 'That was the last planned problem. Give a warm closing, then call finish_interview.' };
  }
  const q = selectQuestion({
    bank: deps.bank,
    mode: state.mode,
    difficulty: state.difficulty,
    askedIds: state.askedIds,
    topic: state.currentTopic,
    questionIndex: state.questionIndex,
    seed: state.seed,
  });
  if (!q) {
    return { no_more_problems: true, message: 'No more problems are available. Give a warm closing, then call finish_interview.' };
  }
  state.current = q;
  state.askedIds.push(q.id);
  state.currentStudentTurns = [];
  // Full guidance also lives in the system prompt next turn; we return it here so the model can
  // ask + handle the question well on this same turn.
  return {
    number: state.evidence.length + 1,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    answer: q.answer,
    model_reasoning_path: q.modelReasoningPath,
    rubric: q.rubric,
    common_mistakes: q.commonMistakes,
    live_probes: q.liveProbes,
    hints: q.hints,
  };
}

/** The note we inject as a "user" turn so the model knows about non-spoken events (skip, start, etc.). */
function controlNote(req: AgentRequest, deps: AgentDeps): string | null {
  switch (req.action) {
    case 'start':
      return '[The interview is starting. Greet me warmly and ask one light warm-up question. Do not ask a maths problem yet.]';
    case 'skip':
      return '[I would like to skip this problem — please acknowledge kindly and move on to the next one.]';
    case 'switch_topic':
      return `[Please switch to ${topicLabel(deps.pack, req.topic)} and give me a problem from it.]`;
    case 'repeat':
      return '[Could you say the problem again, please?]';
    case 'end':
      return '[I need to stop now. Please give a short, warm closing and finish the interview.]';
    default:
      return null;
  }
}

const MAX_CONTEXT_TURNS = 30;

/** Advance one turn: build context, let the model talk + use tools, return Clara's spoken line. */
export async function advanceAgent(prev: AgentState, req: AgentRequest, deps: AgentDeps): Promise<AgentResult> {
  const state: AgentState = structuredCloneSafe(prev);

  if (req.action === 'switch_topic' && req.topic) state.currentTopic = req.topic;

  if (req.action === 'answer' && req.studentText?.trim()) {
    state.transcript.push({ role: 'user', content: req.studentText.trim() });
    if (state.current) state.currentStudentTurns.push(req.studentText.trim());
  } else {
    const note = controlNote(req, deps);
    if (note) state.transcript.push({ role: 'user', content: note });
  }

  const system = buildSystemPrompt(deps.pack, state);
  const recent = state.transcript.slice(-MAX_CONTEXT_TURNS);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...recent.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
  ];

  let say = '';
  for (let i = 0; i < 5; i++) {
    const res = await deps.chat({ messages, tools: TOOLS });
    if (res.toolCalls.length > 0) {
      messages.push({ role: 'assistant', content: res.content || '', tool_calls: res.raw });
      for (const call of res.toolCalls) {
        const result = executeTool(call, state, deps);
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: JSON.stringify(result) });
      }
      if (res.content?.trim()) say = say ? `${say} ${res.content.trim()}` : res.content.trim();
      continue;
    }
    if (res.content?.trim()) say = say ? `${say} ${res.content.trim()}` : res.content.trim();
    break;
  }

  if (say) state.transcript.push({ role: 'assistant', content: say });
  return { say, state, done: state.done };
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}
