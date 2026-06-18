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
    '',
    `How to run this ${mock ? 'mock interview' : 'practice session'}:`,
    `- This is a spoken ${pack.subject} mini-interview for an 11+ candidate (about 10–11 years old).`,
    '- Begin with a warm greeting and ONE light warm-up question to settle nerves. Do not ask a maths problem yet.',
    '- To get each problem, call the tool next_problem. It returns the problem text and its answer. The answer is for YOUR eyes only — NEVER say it, spell it out, or confirm/deny their guess by stating it. Read the problem clearly, once; repeat it verbatim if asked, but do not rephrase the maths.',
    '- Ask ONE problem at a time, then listen. Encourage them to think out loud and explain their method. Praise the method, not just the answer.',
    '- If they are stuck or wrong, behave like a real tutor — never hand over the answer. Help them in SMALL steps, ONE short nudge per turn (do not list all the steps at once). First check they understood the question; next time name the method or strategy (for example: line the numbers up in columns and subtract from the units, borrowing when needed; the bus stop method for division; finding a quarter of an amount); and if they are still stuck, walk them through just the first step and ask them to take the next. Give as many genuine, escalating hints as they need — but always just one short nudge at a time, and never give up on them.',
    '- Move on only once they have made a real attempt, or you have genuinely helped them work it through. When you move on, call next_problem and pass your honest judgement of the problem they just finished (outcome, method_quality, a short note) so it is recorded for their feedback.',
    mock
      ? `- Aim for about ${state.targetQuestions} problems in total, then give a warm closing and call finish_interview. If next_problem tells you there are no more problems, wrap up.`
      : '- Keep going on the chosen topic. The student may switch topics or end whenever they like.',
    '- If the student asks to skip, acknowledge kindly and call next_problem with outcome "skipped".',
    '- Keep every turn to one or two short sentences — brevity matters more than completeness, since you can always continue next turn. The student should do most of the talking.',
    '- To finish: thank them warmly, give one genuine, specific positive, and tell them to end the interview to see their feedback, then call finish_interview.',
    '',
    `Progress so far: ${state.questionIndex} problem(s) done${mock ? ` of about ${state.targetQuestions}` : ''}. Current difficulty: ${state.difficulty}.`,
    state.current
      ? `The problem currently on the table is: "${state.current.question}" — its answer, PRIVATE, is: ${state.current.answer}.`
      : 'No problem is on the table yet.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function logEvidence(state: AgentState, args: { outcome?: string; method_quality?: string; note?: string }) {
  if (!state.current) return;
  const outcome = (VALID_OUTCOMES.has(args.outcome as Outcome) ? args.outcome : 'stuck') as Outcome;
  const methodQuality = (['sound', 'partial', 'none', 'unknown'].includes(args.method_quality as string)
    ? args.method_quality
    : 'unknown') as Evidence['methodQuality'];
  state.evidence.push(
    makeEvidence(state.evidence.length + 1, state.current, state.currentStudentTurns.join(' ').trim(), 0, {
      outcome,
      methodQuality,
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
  return { number: state.evidence.length + 1, topic: q.topic, difficulty: q.difficulty, question: q.question, answer: q.answer };
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
