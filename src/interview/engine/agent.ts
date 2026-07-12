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
import type { BankQuestion, Difficulty, Evidence, Mode, Outcome } from './types';
import { clampDifficulty } from './types';
import type { SubjectPack } from '../subjects/types';
import { selectQuestion } from '../bank/select';
import { nextDifficulty } from './adapt';
import { makeEvidence } from './evidence';
import { CORE_PRINCIPLES, CORE_SPEAKING_STYLE } from './core';

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
  const seed = args.seed ?? Math.floor(Math.random() * 2 ** 31);
  // Jitter the opening difficulty a touch (seed-based) so a new interview doesn't always open on the
  // single easiest question — while still starting gently. Adapt takes over from there.
  const startDifficulty = args.mode === 'mock'
    ? clampDifficulty(args.pack.startDifficulty + (seed % 2))
    : args.pack.startDifficulty;
  return {
    subject: args.subject,
    mode: args.mode,
    currentTopic: args.mode === 'practice' ? args.topic : undefined,
    difficulty: startDifficulty,
    askedIds: [],
    current: null,
    currentStudentTurns: [],
    evidence: [],
    transcript: [],
    questionIndex: 0,
    targetQuestions: args.pack.mockTargetQuestions,
    seed,
    done: false,
  };
}

/**
 * Which half of a two-phase (mixedBank) mock we're in.
 * - `about-you`: the first `primaryShare` questions — warm get-to-know-you (interests, school, family).
 * - `challenge`: the harder second half (maths / logic / current-affairs).
 * Subjects without a mixedBank are always `challenge`. `aboutYouCount` is how many about-you
 * questions the run plans (0 when there's no about-you phase).
 */
export function phaseInfo(pack: SubjectPack, state: AgentState): { phase: 'about-you' | 'challenge'; aboutYouCount: number } {
  const mix = pack.mixedBank;
  if (mix && state.mode === 'mock') {
    const aboutYouCount = Math.max(1, Math.round(mix.primaryShare * state.targetQuestions));
    return { phase: state.questionIndex < aboutYouCount ? 'about-you' : 'challenge', aboutYouCount };
  }
  return { phase: 'challenge', aboutYouCount: 0 };
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
    '- Open PROFESSIONALLY, warmly and BRIEFLY, like a real school interviewer — do not yap. In one or two short sentences: a quick greeting, your name, a single line to put them at ease, then invite them to introduce themselves ("Hi, I\'m Clara — nothing to be nervous about. Tell me a little about yourself."). Do NOT pile on multiple reassurances or a speech. Keep the whole warm-up to ONE short exchange: after their intro (however brief or rambling), say something like "lovely — let\'s begin" and move straight to the first real question. Do NOT chase the warm-up with follow-up after follow-up, and do NOT ask a gimmicky ice-breaker (no "what animal would you be"). If they ramble, gently take control and move on.',
    '- The authored question bank is your PRIMARY material — your lesson notes. Always reach for it first: ask only problems you get from next_problem (never invent your own puzzles), and never reveal or change a problem\'s answer. For hints, probes and explanations, lean on each problem\'s authored guidance (the hint ladder, the live probes, the model reasoning path) as your first port of call.',
    '- But you are a real, intelligent tutor — NOT a script-reader. Put everything in your own natural, spoken words, and when a child says something unexpected, asks a tangent, or needs help the notes do not quite cover, use your own judgement to guide them well. Prefer the document; think for yourself and improvise warmly when it runs out. The notes are a tool you pull from, not lines you recite.',
    '- To get each problem, call the tool next_problem. It returns the problem text and its answer plus its authored guidance. The answer is for YOUR eyes only — NEVER say it or confirm/deny their guess by stating it.',
    '- READ EVERY CHALLENGE PROBLEM (maths, logic, current-affairs) VERBATIM — word for word, IN FULL, the first time you ask it. Include every option, statement, number, name and clue exactly as written (if it lists statements A, B, C, D, read ALL of them out). NEVER summarise, shorten, paraphrase or drop part of a hard problem — a question like "four statements, which is true?" with the statements omitted is useless. (The light "about you" questions are the exception: those you can put in your own casual words and keep short — no need to spell them out formally.)',
    '- Ask ONE problem at a time, then listen. Encourage them to think out loud and explain their method. Praise the method, not just the answer.',
    '- BRIDGE between questions so it feels like a real conversation, not a quiz firing off in a row. Before you read a NEW question, first give a short warm reaction to what they just said and signal that you are moving on — e.g. "Nice one, thank you." · "That\'s a good effort — let\'s try another." · "Great, are you ready for the next one?" Then a small beat (write it as "…" so you pause naturally), then read the next question. NEVER jump straight into a new question with no lead-in. Keep the bridge to a handful of words; the question text itself is still read verbatim and in full.',
    '- IF THEY ARE RIGHT AND HAVE EXPLAINED THEIR WORKING: just affirm it warmly and briefly ("That\'s right — lovely working") and move straight on to the next problem. Do NOT keep probing, re-explaining, summarising, or padding when their reasoning is already clear and correct. Only probe "how did you get that?" when they gave an answer with NO working (so you can tell it wasn\'t a guess).',
    '- PRODUCTIVE STRUGGLE — do not hand out hints, methods, or the answer too early. The FIRST time a child goes quiet, says "I don\'t know", or even directly ASKS for a hint, do NOT give one yet. Reassure them and insist they have a real go first — "Have a try first, even a rough guess; what\'s your first thought?" Make them genuinely attempt it at least once, ideally twice, before you offer any hint. Never give away the method just because they asked.',
    '- Only once they have genuinely had a go and are STILL stuck (usually after a second or third attempt) do you start hinting. Then behave like a real tutor — never hand over the answer, help in SMALL steps, ONE short nudge per turn (do not list all the steps at once): first check they understood the question; next name the method or strategy; and if still stuck, walk them through just the first step and ask them to take the next. Give as many escalating hints as they need, one at a time, and never give up on them.',
    '- HALF-FINISHED ANSWERS — do this readily on the hard problems. If their answer looks incomplete — they made a strong start but trailed off, stopped mid-method, or gave only the first step — do NOT jump in with a hint or the method. Point out warmly that they are onto something and put the thought back to THEM to finish: "That\'s a great start — I don\'t think you quite finished it. You\'re onto something, keep that thought going." Prefer this to hand-holding whenever an answer is on-track but unfinished; only drop to the hint ladder when they are genuinely stuck with no idea, not merely unfinished.',
    '- Move on only once they have made a real attempt, or you have genuinely helped them work it through. When you move on, call next_problem and pass your honest judgement of the problem they just finished (outcome, method_quality, the rubric band if one was given, and a short note) so it is recorded for their feedback.',
    mock
      ? `- Aim for about ${state.targetQuestions} problems in total, then give a warm closing and call finish_interview. If next_problem tells you there are no more problems, wrap up.`
      : '- Keep going on the chosen topic. The student may switch topics or end whenever they like.',
    '- PACE — read the two parts differently. In the ABOUT YOU part, keep it brisk and stay in control: one brief nudge to answer, and if they still dodge, stall or ramble, MOVE ON to a fresh question rather than squeezing one dry. But in the CHALLENGE part, the opposite — those few hard questions ARE the interview, so do NOT rush them: stay on one, probe and go two-part, and give them real time to think and finish (only move on once they have genuinely worked at it or are truly stuck). Either way never ask the exact same question more than twice or re-phrase-and-re-ask the same one on a loop.',
    '- If the student clearly wants to STOP early — "can we stop", "I\'m done", "end the interview", or they keep refusing to engage — do not fight it. Give a warm, proper closing in your own words ("That\'s all I have for you today — thank you so much for your time, you did really well"), offer one genuine positive, tell them to end the interview to see their feedback, and then call finish_interview.',
    '- Keep every turn to one or two short sentences — brevity matters more than completeness, since you can always continue next turn. The student should do most of the talking.',
    '- To finish: thank them warmly, give one genuine, specific positive, and tell them to end the interview to see their feedback, then call finish_interview.',
    '',
    phaseLine(pack, state),
    `Progress so far: ${state.questionIndex} problem(s) done${mock ? ` of about ${state.targetQuestions}` : ''}. Current difficulty: star level ${state.difficulty} of 5 (higher = harder). The bank handles which problem to serve — just ask what next_problem gives you.`,
    renderCurrentProblem(state.current),
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/** Tell the model which part of a two-phase mock it's in, so it adopts the right mode. */
function phaseLine(pack: SubjectPack, state: AgentState): string {
  if (!pack.mixedBank || state.mode !== 'mock') return '';
  const { phase, aboutYouCount } = phaseInfo(pack, state);
  return phase === 'about-you'
    ? `CURRENT PART: ABOUT YOU (question ${state.questionIndex + 1} of ~${aboutYouCount} in this part). This is the warm get-to-know-you half — ask about their interests, hobbies, activities, school, family and reading. Keep it LIGHT and brisk: put these in your own casual words (no need to spell them out formally), one main question, at most one follow-up, then move on. Do not over-probe or hand-hold here. No maths/logic yet.`
    : `CURRENT PART: THE CHALLENGE. The "about you" part is over. There are only a few of these and they are the heart of the interview, so SLOW DOWN and give each one real time (think a few minutes of back-and-forth per question, not an instant answer). Ask the hard problem the bank gives you exactly, then genuinely PROBE the reasoning — where it fits, run it as TWO PARTS like a top-school interview: an accessible opening part, then a harder extension or an ethical "what do you think, and why?" follow-up (the authored probes are ideal). Push for depth: "why?", "what if…?", "are you sure?", "can you convince me?". This is where you dig in — but on half-finished answers, nudge them to finish rather than hinting.`;
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
    // Adapt to how they did: clean solve (no hints) climbs; a hinted solve holds; a wrong/stuck
    // answer eases down so the next one is the same level or gentler.
    state.difficulty = nextDifficulty(state.difficulty, outcome, hintsUsed) as Difficulty;
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

  // Two-phase mix (e.g. 11+): draw the first `primaryShare` from the primarySubject at a fixed,
  // conversational difficulty, then the rest from the harder secondarySubjects.
  const mix = deps.pack.mixedBank;
  let bank = deps.bank;
  let difficulty = state.difficulty;
  if (mix && state.mode === 'mock') {
    const { aboutYouCount: primaryCount } = phaseInfo(deps.pack, state);
    if (state.questionIndex < primaryCount) {
      bank = deps.bank.filter((b) => b.subject === mix.primarySubject);
      difficulty = mix.primaryDifficulty;
    } else {
      if (state.questionIndex === primaryCount) state.difficulty = mix.secondaryStartDifficulty; // reset once, on entry
      // Guarantee a spread across the hard subjects so EVERY challenge subject (crucially
      // current-affairs) gets asked at least once: force one of each secondary subject in a
      // seed-rotated order for the first N challenge questions; after that, draw freely.
      const subs = mix.secondarySubjects;
      const rot = subs.length ? state.seed % subs.length : 0;
      const order = subs.map((_, i) => subs[(i + rot) % subs.length]);
      const pos = state.questionIndex - primaryCount; // 0-based position within the challenge phase
      const forced = pos < order.length ? order[pos] : null;
      bank = deps.bank.filter((b) => (forced ? b.subject === forced : subs.includes(b.subject)));
      // Keep EVERY challenge question genuinely hard — fixed, not eased by adaptation. This guarantees
      // at least one 4-star (maths/logic carry 4-star questions). Current-affairs has no 4-star, so
      // selection's nearest-level fallback lands on its own top tier — that's the thought-provoking one.
      difficulty = mix.secondaryStartDifficulty;
    }
    if (bank.length === 0) bank = deps.bank.filter((b) => mix.secondarySubjects.includes(b.subject));
    if (bank.length === 0) bank = deps.bank;
  }

  const params = {
    mode: state.mode,
    askedIds: state.askedIds,
    topic: state.currentTopic,
    questionIndex: state.questionIndex,
    seed: state.seed,
    // Prefer a category not yet covered this run, for a good spread across question types.
    recentTopics: state.evidence.map((e) => e.topic),
  };
  const q = selectQuestion({ bank, difficulty, ...params })
    // If the phase pool is exhausted, fall back to the whole bank so the interview never stalls.
    ?? (bank !== deps.bank ? selectQuestion({ bank: deps.bank, difficulty: state.difficulty, ...params }) : null);
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
    question_type: q.questionType,
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

  const questionBefore = state.current?.id;
  let say = '';
  // Never let a model/network hiccup 500 the whole turn — on failure we fall back to a spoken line
  // below so the avatar always says *something* rather than going silent.
  try {
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
  } catch (err) {
    console.error('agent chat loop failed:', (err as Error)?.message || err);
  }

  // Guarantee we leave the warm-up. If we're mid-interview with no question on the table (the model
  // kept chatting instead of calling next_problem after the opener), pull the next one and ask it.
  if (!state.done && req.action === 'answer' && !state.current &&
      !(state.mode === 'mock' && state.questionIndex >= state.targetQuestions)) {
    const forced = executeTool({ id: 'forced-next', name: 'next_problem', args: {} }, state, deps) as any;
    if (forced?.question) say = say ? `${say} ${forced.question}` : forced.question;
  }

  // Deterministically END a mock once all planned problems are done. The bank is out of questions
  // (questionIndex has reached the target and nothing is on the table), so there is nothing left to
  // ask — do NOT fall through to the "take your time" nudge, which kept a finished interview alive
  // when the student spammed Skip. Close warmly and mark it done regardless of what the model did.
  if (!state.done && state.mode === 'mock' && !state.current &&
      state.questionIndex >= state.targetQuestions) {
    state.done = true;
    if (!say.trim()) {
      say = "That's everything I had for you today — you did really well. Go ahead and end the interview to see your feedback.";
    }
  }

  // Never leave the avatar silent. If the model pulled a fresh question via next_problem but forgot
  // to actually say it, read that question aloud — otherwise fall back to a warm opener / nudge.
  if (!say.trim()) {
    const freshQuestion = state.current && state.current.id !== questionBefore ? state.current.question : '';
    if (freshQuestion) {
      say = freshQuestion;
    } else {
      const openers = deps.pack.openers ?? [];
      say = req.action === 'start' && openers.length
        ? openers[Math.floor(Math.random() * openers.length)]
        : "Take your time — whenever you're ready, talk me through your thinking.";
    }
  }

  state.transcript.push({ role: 'assistant', content: say });
  return { say, state, done: state.done };
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}
