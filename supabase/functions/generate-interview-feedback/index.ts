import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mathsPack } from "./_shared/subjects/maths/pack.ts";
import { logicPack } from "./_shared/subjects/logic/pack.ts";

// Engine-driven subjects score from their OWN subject pack — the same file that drives the
// interview — so the feedback uses the document's qualities + scoring philosophy, not a hardcoded
// rubric. Maps the four assessed domains onto the existing four score columns.
const ENGINE_PACKS: Record<string, any> = {
  'maths-interview': mathsPack,
  'logic-puzzles': logicPack,
};

function buildEngineDrivenSystemPrompt(pack: any): string {
  const [d1, d2, d3, d4] = pack.domains;
  return `You are an expert, warm evaluator for an 11+ ${pack.subject} mini-interview. You MUST respond with valid JSON only.

${pack.scoringPhilosophy || ''}

Score these FOUR dimensions, each 0-5 (total out of 20). Weight PROCESS and ADAPTABILITY far above the final answer — a child who reasons well but reaches a wrong answer outscores one who states a correct answer with no reasoning:
1. ${d1}
2. ${d2}
3. ${d3}
4. ${d4}

Ground your scores in the structured evidence log provided (per-question reasoning band, outcome, hints used, and notes) as well as the transcript. For each dimension, write feedback that names one specific reasoning strength actually observed and one concrete next step — warm, concrete, process-focused, never reducing the child to their final answer.

CRITICAL: respond ONLY with a valid JSON object, no markdown. Required structure (the four keys below map to ${d1}, ${d2}, ${d3}, ${d4} in order):
{
  "pattern_recognition_score": 0,
  "logical_deduction_score": 0,
  "mathematical_logic_score": 0,
  "clarity_of_thought_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "pattern_recognition": "feedback on ${d1}",
    "logical_deduction": "feedback on ${d2}",
    "mathematical_logic": "feedback on ${d3}",
    "clarity_of_thought": "feedback on ${d4}",
    "overall": "Overall assessment, process-focused",
    "band_assessment": "Which band and why"
  }
}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Import interview configuration for dynamic prompt generation
const INTERVIEW_TYPES: Record<string, any> = {
  '11-plus': {
    id: '11-plus',
    name: '11+ School Interview',
    category: 'academic',
    scoringSystem: '0-5',
    scoringCriteria: [
      'Personal Insight & Self-Awareness',
      'Reasoning & Problem-Solving', 
      'Extracurricular Activities & Leadership',
      'Current Awareness & Curiosity'
    ]
  },
  'logic-puzzles': {
    id: 'logic-puzzles',
    name: '11+ Logic Puzzles',
    category: 'academic',
    scoringSystem: '0-5',
    scoringCriteria: [
      'Pattern Recognition & Sequences',
      'Logical Deduction & Reasoning',
      'Mathematical Logic & World Problems',
      'Clarity of Thought'
    ]
  },
  'maths-interview': {
    id: 'maths-interview',
    name: '11+ Maths Mock Interview',
    category: 'maths',
    scoringSystem: '0-5',
    scoringCriteria: [
      'Number & Calculation',
      'Problem-Solving & Method',
      'Mathematical Reasoning',
      'Clarity of Explanation'
    ]
  },
  'verbal-interview': {
    id: 'verbal-interview',
    name: '11+ Verbal Reasoning Mock Interview',
    category: 'logic',
    scoringSystem: '0-5',
    scoringCriteria: [
      'Vocabulary & Word Knowledge',
      'Verbal Reasoning & Deduction',
      'Word Relationships & Patterns',
      'Clarity of Explanation'
    ]
  },
  'current-affairs-interview': {
    id: 'current-affairs-interview',
    name: '11+ Current Affairs & Moral Reasoning Interview',
    category: 'academic',
    scoringSystem: '0-5',
    scoringCriteria: [
      'World Awareness & Engagement',
      'Forming & Defending a View',
      'Considering Other Perspectives',
      'Moral Maturity & Clarity'
    ]
  },
  'demo': {
    id: 'demo',
    name: 'Free Demo Interview',
    category: 'language',
    scoringSystem: '0-5',
    scoringCriteria: [
      'Communication',
      'Clarity',
      'Confidence',
      'Relevance'
    ]
  }
};

// Dynamic system prompt generation based on interview configuration
const getSystemPrompt = (interviewType: string, scoringSystem: string): string => {
  const config = INTERVIEW_TYPES[interviewType] || INTERVIEW_TYPES['11-plus'];
  
  if (interviewType === 'logic-puzzles') {
    return `You are an expert evaluator for logic puzzles interviews designed for 11+ preparation. You MUST respond with valid JSON only.

SCORING RUBRIC (Each section scored 0-5, total out of 20):

Section 1: Pattern Recognition & Sequences (5 marks)
- 5: Exceptional pattern recognition; quickly identifies complex sequences and explains reasoning clearly
- 4: Strong pattern identification with good reasoning; minor gaps in explanation
- 3: Good pattern recognition ability; mostly accurate with some hesitation
- 2: Basic pattern recognition; needs guidance but shows understanding
- 1: Limited pattern recognition; struggles with complex sequences
- 0: No pattern recognition ability or coherent responses

Section 2: Logical Deduction & Reasoning (5 marks)
- 5: Outstanding deductive reasoning; handles multi-step problems with ease
- 4: Strong logical thinking; good at working through complex problems
- 3: Solid deductive reasoning; minor errors in complex scenarios
- 2: Basic logical reasoning; needs guidance on difficult problems
- 1: Limited deductive ability; struggles with logical connections
- 0: No logical reasoning demonstrated

Section 3: Mathematical Logic & World Problems (5 marks)
- 5: Excellent mathematical reasoning; fluent translation of words to math
- 4: Strong mathematical logic; good problem-solving approach
- 3: Solid mathematical reasoning with minor calculation errors
- 2: Basic mathematical logic; needs guidance on complex problems
- 1: Limited mathematical reasoning; struggles with word problems
- 0: No mathematical reasoning demonstrated

Section 4: Clarity of Thought (5 marks)
- 5: Exceptional clarity in explanations; articulates reasoning process brilliantly
- 4: Clear explanations; good at verbalizing thought processes
- 3: Generally clear in explanations; some minor gaps in articulation
- 2: Basic clarity; explanations are understandable but could be clearer
- 1: Limited clarity; difficulty explaining reasoning clearly
- 0: Very unclear or no coherent explanations

SCORING BANDS:
18-20: Exceptional candidate; outstanding logical reasoning abilities
15-17: Strong candidate; excellent logical thinking skills
12-14: Good performance; solid reasoning with room for development
8-11: Developing; basic reasoning skills, needs practice
0-7: Needs Support; requires significant development in logical reasoning

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "pattern_recognition_score": 0,
  "logical_deduction_score": 0,
  "mathematical_logic_score": 0,
  "clarity_of_thought_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "pattern_recognition": "Brief feedback here",
    "logical_deduction": "Brief feedback here",
    "mathematical_logic": "Brief feedback here",
    "clarity_of_thought": "Brief feedback here",
    "overall": "Overall assessment here",
    "band_assessment": "Band assessment here"
  }
}`;
  }
  
  if (interviewType === 'maths-interview') {
    return `You are an expert evaluator for 11+ maths mock interviews. The student answered 10 maths questions out loud, talking through their method. You MUST respond with valid JSON only.

SCORING RUBRIC (Each section scored 0-5, total out of 20):

Section 1: Number & Calculation (5 marks)
- 5: Highly accurate and fluent with numbers; calculations are quick and correct
- 4: Strong calculation skills; minor slips only
- 3: Generally accurate; some calculation errors under pressure
- 2: Basic calculation ability; frequent errors needing guidance
- 1: Limited accuracy; struggles with basic calculation
- 0: No accurate calculation demonstrated

Section 2: Problem-Solving & Method (5 marks)
- 5: Chooses an efficient, sensible method every time and applies it well
- 4: Good choice of method with minor inefficiencies
- 3: Reaches a workable method but may need prompting
- 2: Struggles to choose a method without guidance
- 1: Rarely identifies a usable method
- 0: No method demonstrated

Section 3: Mathematical Reasoning (5 marks)
- 5: Reasons fluently through multi-step and word problems; translates words to maths with ease
- 4: Strong reasoning; handles most multi-step problems well
- 3: Solid reasoning with minor gaps on harder problems
- 2: Basic reasoning; needs guidance on multi-step problems
- 1: Limited reasoning; struggles with word problems
- 0: No mathematical reasoning demonstrated

Section 4: Clarity of Explanation (5 marks)
- 5: Explains each step clearly and confidently out loud
- 4: Clear explanations; good at verbalising the method
- 3: Generally clear with some gaps in articulation
- 2: Understandable but could be much clearer
- 1: Difficulty explaining the method
- 0: Very unclear or no coherent explanation

SCORING BANDS:
18-20: Exceptional; outstanding maths skills and explanation
15-17: Strong; excellent mathematical thinking
12-14: Good; solid maths with room for development
8-11: Developing; basic skills, needs practice
0-7: Needs Support; requires significant development in maths

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "pattern_recognition_score": 0,
  "logical_deduction_score": 0,
  "mathematical_logic_score": 0,
  "clarity_of_thought_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "pattern_recognition": "Brief feedback on Number & Calculation here",
    "logical_deduction": "Brief feedback on Problem-Solving & Method here",
    "mathematical_logic": "Brief feedback on Mathematical Reasoning here",
    "clarity_of_thought": "Brief feedback on Clarity of Explanation here",
    "overall": "Overall assessment here",
    "band_assessment": "Band assessment here"
  }
}`;
  }

  if (interviewType === 'verbal-interview') {
    return `You are an expert evaluator for 11+ verbal reasoning mock interviews. The student answered 10 verbal reasoning questions out loud, talking through their thinking. You MUST respond with valid JSON only.

SCORING RUBRIC (Each section scored 0-5, total out of 20):

Section 1: Vocabulary & Word Knowledge (5 marks)
- 5: Excellent vocabulary; understands and uses precise word meanings with ease
- 4: Strong vocabulary; minor gaps only
- 3: Generally good word knowledge; occasional uncertainty
- 2: Basic vocabulary; needs guidance on less common words
- 1: Limited vocabulary; struggles with word meanings
- 0: No relevant word knowledge demonstrated

Section 2: Verbal Reasoning & Deduction (5 marks)
- 5: Reasons fluently through word logic and deduction problems
- 4: Strong reasoning; handles most problems well
- 3: Solid reasoning with minor gaps on harder problems
- 2: Basic reasoning; needs guidance on multi-step problems
- 1: Limited reasoning; struggles with verbal logic
- 0: No verbal reasoning demonstrated

Section 3: Word Relationships & Patterns (5 marks)
- 5: Quickly spots analogies, codes, sequences and word patterns
- 4: Strong pattern recognition with good reasoning
- 3: Good ability; mostly accurate with some hesitation
- 2: Basic pattern recognition; needs guidance
- 1: Limited ability with word patterns
- 0: No pattern recognition demonstrated

Section 4: Clarity of Explanation (5 marks)
- 5: Explains each step clearly and confidently out loud
- 4: Clear explanations; good at verbalising reasoning
- 3: Generally clear with some gaps in articulation
- 2: Understandable but could be much clearer
- 1: Difficulty explaining reasoning
- 0: Very unclear or no coherent explanation

SCORING BANDS:
18-20: Exceptional; outstanding verbal reasoning ability
15-17: Strong; excellent verbal reasoning skills
12-14: Good; solid verbal reasoning with room for development
8-11: Developing; basic skills, needs practice
0-7: Needs Support; requires significant development in verbal reasoning

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "pattern_recognition_score": 0,
  "logical_deduction_score": 0,
  "mathematical_logic_score": 0,
  "clarity_of_thought_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "pattern_recognition": "Brief feedback on Vocabulary & Word Knowledge here",
    "logical_deduction": "Brief feedback on Verbal Reasoning & Deduction here",
    "mathematical_logic": "Brief feedback on Word Relationships & Patterns here",
    "clarity_of_thought": "Brief feedback on Clarity of Explanation here",
    "overall": "Overall assessment here",
    "band_assessment": "Band assessment here"
  }
}`;
  }

  if (interviewType === 'current-affairs-interview') {
    return `You are an expert evaluator for 11+ current affairs & moral reasoning interviews at top independent school level. The student discussed news and ethical dilemmas out loud and was deliberately pushed back on. There are NO right answers — assess the QUALITY OF REASONING, not which views they hold. You MUST respond with valid JSON only.

SCORING RUBRIC (Each section scored 0-5, total out of 20):

Section 1: World Awareness & Engagement (5 marks)
- 5: Genuinely engaged with the world; cites specific stories/issues accurately
- 4: Good awareness; mostly specific and accurate
- 3: Some awareness but general or vague in places
- 2: Limited awareness; struggles to cite anything specific
- 1: Very little engagement with the wider world
- 0: No awareness demonstrated

Section 2: Forming & Defending a View (5 marks)
- 5: Takes a clear position and defends it well under challenge without crumbling
- 4: Forms a view and defends it with minor wobbles
- 3: Forms a view but defence is shaky when pushed
- 2: Hedges heavily or abandons positions under mild pressure
- 1: Cannot commit to or defend a position
- 0: No coherent view formed

Section 3: Considering Other Perspectives (5 marks)
- 5: Readily acknowledges and engages with the strongest opposing arguments; can argue the other side
- 4: Acknowledges other views and engages with them
- 3: Recognises other views exist but engages only superficially
- 2: Treats questions as having obvious answers; little perspective-taking
- 1: Cannot see or entertain opposing views
- 0: No perspective-taking demonstrated

Section 4: Moral Maturity & Clarity (5 marks)
- 5: Sits with genuinely hard questions; intellectually honest about uncertainty; explains reasoning clearly
- 4: Thoughtful and mostly clear; some honesty about difficulty
- 3: Reasonable but rushes to comfortable answers; explanations adequate
- 2: Avoids difficulty or bluffs confidence; explanations unclear
- 1: Little moral reflection; very unclear
- 0: No coherent moral reasoning or explanation

SCORING BANDS:
18-20: Exceptional; outstanding awareness and moral reasoning
15-17: Strong; excellent reasoning and engagement
12-14: Good; solid engagement with room for development
8-11: Developing; needs practice
0-7: Needs Support; requires significant development

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "pattern_recognition_score": 0,
  "logical_deduction_score": 0,
  "mathematical_logic_score": 0,
  "clarity_of_thought_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "pattern_recognition": "Brief feedback on World Awareness & Engagement here",
    "logical_deduction": "Brief feedback on Forming & Defending a View here",
    "mathematical_logic": "Brief feedback on Considering Other Perspectives here",
    "clarity_of_thought": "Brief feedback on Moral Maturity & Clarity here",
    "overall": "Overall assessment here",
    "band_assessment": "Band assessment here"
  }
}`;
  }

  // For 11+ keep existing detailed prompt
  return `You are an expert evaluator for 11+ private school admissions interviews. You MUST respond with valid JSON only.

SCORING RUBRIC (Each section scored 0-5, total out of 20):

Section 1: Personal Insight and Expression (5 marks)
- 5: Exceptionally articulate and self-reflective; demonstrates emotional intelligence and authenticity well beyond age expectations
- 4: Confident and clear; offers thoughtful responses grounded in real personal insight
- 3: Reasonably confident; responses may be general or rehearsed but competently delivered
- 2: Hesitant or vague; limited depth or connection to own experience
- 1: Minimal response; lacks reflection, self-awareness, or engagement
- 0: No response or completely inappropriate/incoherent response

Section 2: Reasoning and Intellectual Agility (5 marks)
- 5: Demonstrates elegant and flexible reasoning, explaining their logic clearly even under challenge
- 4: Shows sound logic and perseverance; minor slips in method or expression but good intellectual instinct
- 3: Attempts to reason through problems but may rely on guesswork or lack a clear process
- 2: Struggles with reasoning tasks or retreats quickly from uncertainty
- 1: Unable to engage meaningfully with reasoning questions
- 0: No attempt at reasoning or completely illogical responses

Section 3: Extracurricular Engagement and Depth (5 marks)
- 5: Deep, sustained commitment to one or more pursuits; evidence of self-driven learning or leadership
- 4: Strong, consistent engagement in at least one area; speaks with genuine enthusiasm and clarity
- 3: Mentions several activities but without much depth or individual agency
- 2: Involvement appears shallow or externally driven (heavily parent-led)
- 1: No meaningful extracurricular interests mentioned or evident
- 0: No response or completely inappropriate discussion of activities

Section 4: Current Awareness and Moral Reasoning (5 marks)
- 5: Offers a nuanced, thoughtful view on global or ethical matters; demonstrates empathy and conceptual depth
- 4: Aware of major issues and can express a coherent, if developing, perspective
- 3: Basic awareness with limited reasoning or oversimplified conclusions
- 2: Minimal engagement with the world beyond school or family; unclear or confused views
- 1: No relevant awareness or ability to discuss broader issues meaningfully
- 0: No response or completely inappropriate/uninformed views

SCORING BANDS:
18-20: Outstanding candidate; scholarship-level potential
15-17: Strong candidate; likely offer holder at leading academic schools
12-14: Sound performance; has promise but may benefit from development
8-11: Developing; would benefit from further preparation
0-7: Below expected level; needs significant support

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "personal_insight_score": 0,
  "reasoning_score": 0,
  "extracurricular_score": 0,
  "current_awareness_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "personal_insight": "Brief feedback here",
    "reasoning": "Brief feedback here",
    "extracurricular": "Brief feedback here",
    "current_awareness": "Brief feedback here",
    "overall": "Overall assessment here",
    "band_assessment": "Band assessment here"
  }
}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

try {
  // Input validation and sanitization
  const inputBody = await req.json();
  const { transcription, sessionId, userId, interviewType, interviewCategory, scoringSystem, sessionReference } = inputBody;

  // Validate required fields
  if (!transcription || typeof transcription !== 'string') {
    return new Response(JSON.stringify({ error: 'Valid transcription is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!userId || typeof userId !== 'string') {
    return new Response(JSON.stringify({ error: 'Valid userId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth check: ensure caller matches provided userId
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (userData.user.id !== userId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: max 3 feedback generations per 10 minutes per user
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', tenMinutesAgo);
  if ((recentCount ?? 0) >= 3) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait before generating more feedback.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Consume one credit before any expensive work — rejects with 402 if balance is zero
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: creditConsumed, error: creditError } = await supabaseUser.rpc('consume_credit');
  if (creditError || !creditConsumed) {
    return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
      status: 402,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

    // Sanitize and validate transcription length
    const sanitizedTranscription = transcription.trim();
    if (sanitizedTranscription.length < 100) {
      return new Response(JSON.stringify({ error: 'Transcription too short — minimum 100 characters required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sanitizedTranscription.length > 50000) {
      return new Response(JSON.stringify({ error: 'Transcription too long - maximum 50,000 characters allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = supabaseAdmin;

    // Engine-driven interviews carry a structured evidence log on the session row. Prefer it: it is
    // cheaper and more reliable to score from than re-parsing the raw transcript, and it powers the
    // "questions asked / skipped" review the student sees.
    let evidence: any[] = [];
    let questionsReview: any[] = [];
    if (sessionReference) {
      const { data: sessionRow } = await supabaseAdmin
        .from('interview_sessions')
        .select('evidence, subject, engine_state')
        .eq('session_reference', sessionReference)
        .eq('user_id', userId)
        .maybeSingle();
      if (sessionRow?.evidence && Array.isArray(sessionRow.evidence)) {
        evidence = sessionRow.evidence;

        // If the interview ended with a question still "on the table" (never recorded by the model),
        // score it as a DNF so the last question always counts — even if they ran out of time on it.
        const current = (sessionRow as any).engine_state?.current;
        if (current?.id && !evidence.some((e: any) => e.id === current.id)) {
          const partial = Array.isArray((sessionRow as any).engine_state?.currentStudentTurns)
            ? (sessionRow as any).engine_state.currentStudentTurns.join(' ').trim()
            : '';
          evidence = [...evidence, {
            index: evidence.length + 1,
            id: current.id,
            topic: current.topic,
            difficulty: current.difficulty,
            question: current.question,
            outcome: 'incomplete',
            skipped: false,
            hintsUsed: 0,
            studentAnswer: partial,
            methodQuality: 'unknown',
            notes: 'Interview ended before this question was finished.',
          }];
        }

        // Flatten the evidence log into the dashboard's per-question table. Best-effort and
        // idempotent (clears any prior rows for this session so regenerating feedback won't dupe).
        try {
          await supabaseAdmin.from('question_attempts').delete().eq('session_reference', sessionReference).eq('user_id', userId);
          const rows = evidence.map((e: any) => ({
            user_id: userId,
            session_reference: sessionReference,
            interview_type: interviewType,
            subject: sessionRow.subject ?? null,
            topic: e.topic ?? null,
            difficulty: e.difficulty ?? null,
            question_id: e.id ?? null,
            question: e.question ?? null,
            outcome: e.outcome ?? null,
            band: e.band ?? null,
            skipped: Boolean(e.skipped),
            hints_used: Number.isFinite(e.hintsUsed) ? e.hintsUsed : 0,
            student_answer: e.studentAnswer ?? null,
            question_index: e.index ?? null,
          }));
          if (rows.length) await supabaseAdmin.from('question_attempts').insert(rows);
        } catch (err) {
          console.warn('question_attempts write skipped (continuing):', (err as any)?.message || err);
        }

        questionsReview = evidence.map((e: any) => ({
          index: e.index,
          topic: e.topic,
          difficulty: e.difficulty,
          question: e.question,
          asked: !e.skipped,
          skipped: Boolean(e.skipped),
          outcome: e.outcome,
          band: e.band || null,
          your_answer: e.studentAnswer || '',
          note: e.notes || '',
        }));
      }
    }

    // A compact, model-readable summary of the evidence to ground the scoring (when available).
    const evidenceSummary = evidence.length
      ? '\n\nStructured evidence log (one line per question — use this to ground your scores):\n' +
        evidence
          .map((e: any) =>
            `Q${e.index} [${e.topic}/${e.difficulty}] ${e.skipped ? 'SKIPPED' : `outcome=${e.outcome}, method=${e.methodQuality}, hints=${e.hintsUsed}`}` +
            (e.skipped ? '' : ` — said: "${(e.studentAnswer || '').slice(0, 200)}"`),
          )
          .join('\n')
      : '';

    // Get system prompt: engine-driven subjects use their own pack (qualities + scoring philosophy);
    // everything else uses the legacy hardcoded rubric.
    const enginePack = ENGINE_PACKS[interviewType as string];
    const systemPrompt = enginePack
      ? buildEngineDrivenSystemPrompt(enginePack)
      : getSystemPrompt(interviewType || '11-plus', scoringSystem || '0-5');

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Preparing OpenAI request...');
      console.log('Transcription length:', sanitizedTranscription.length);
    }

    const requestBody = {
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Evaluate this interview transcription and return ONLY valid JSON with the required fields.\n\n${sanitizedTranscription}${evidenceSummary}` }
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    };

    // Add security headers
    const securityHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Making OpenAI request with model:', requestBody.model);
    }
    
    // Generate feedback using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('OpenAI response status:', response.status);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error status:', response.status);
      return new Response(JSON.stringify({ error: 'Failed to generate feedback' }), {
        status: 500,
        headers: securityHeaders,
      });
    }

    const data = await response.json();
    const feedbackText = data.choices[0].message.content;
    
    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('AI response received successfully');
    }
    
    // Parse the JSON response with robust error handling
    let feedbackData;
    try {
      // Clean the response text and try multiple parsing strategies
      let cleanedText = feedbackText.trim();
      
      // Remove any potential markdown formatting
      cleanedText = cleanedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      
      // Try direct parsing first
        try {
          feedbackData = JSON.parse(cleanedText);
        } catch (firstError) {
          // Try extracting JSON from anywhere in the text
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            feedbackData = JSON.parse(jsonMatch[0]);
          } else {
            throw firstError;
          }
        }
        
        // Validate and ensure all required fields exist with proper types
        if (interviewType === 'logic-puzzles' || interviewType === 'maths-interview' || interviewType === 'verbal-interview' || interviewType === 'current-affairs-interview') {
          // Logic / maths / verbal / current-affairs validation (shared score fields)
          const requiredFields = ['pattern_recognition_score', 'logical_deduction_score', 'mathematical_logic_score', 'clarity_of_thought_score'];
          for (const field of requiredFields) {
            // Convert to number if it's a string
            if (typeof feedbackData[field] === 'string') {
              feedbackData[field] = parseFloat(feedbackData[field]);
            }
            if (typeof feedbackData[field] !== 'number' || isNaN(feedbackData[field]) || feedbackData[field] < 0 || feedbackData[field] > 5) {
              throw new Error(`Invalid or missing ${field}: must be a number between 0-5`);
            }
          }
          
          // Calculate total_score from individual scores
          feedbackData.total_score = feedbackData.pattern_recognition_score + 
                                     feedbackData.logical_deduction_score + 
                                     feedbackData.mathematical_logic_score +
                                     feedbackData.clarity_of_thought_score;
        } else {
          // 11+ validation
          const requiredFields = ['personal_insight_score', 'reasoning_score', 'extracurricular_score', 'current_awareness_score'];
          for (const field of requiredFields) {
            // Convert to number if it's a string
            if (typeof feedbackData[field] === 'string') {
              feedbackData[field] = parseFloat(feedbackData[field]);
            }
            if (typeof feedbackData[field] !== 'number' || isNaN(feedbackData[field]) || feedbackData[field] < 0 || feedbackData[field] > 5) {
              throw new Error(`Invalid or missing ${field}: must be a number between 0-5`);
            }
          }
          
          // Calculate total_score from individual scores
          feedbackData.total_score = feedbackData.personal_insight_score + 
                                     feedbackData.reasoning_score + 
                                     feedbackData.extracurricular_score + 
                                     feedbackData.current_awareness_score;
        }
      
      if (!feedbackData.detailed_feedback || typeof feedbackData.detailed_feedback !== 'object') {
        throw new Error('Missing or invalid detailed_feedback object');
      }
      
    } catch (e) {
      console.error('JSON parsing error:', e.message);
      
      // Create a fallback response based on interview type
      if (interviewType === 'logic-puzzles' || interviewType === 'maths-interview' || interviewType === 'verbal-interview' || interviewType === 'current-affairs-interview') {
        feedbackData = {
          pattern_recognition_score: 3,
          logical_deduction_score: 3,
          mathematical_logic_score: 3,
          clarity_of_thought_score: 3,
          total_score: 12,
          detailed_feedback: {
            pattern_recognition: "Unable to fully assess due to processing error. Please try again.",
            logical_deduction: "Unable to fully assess due to processing error. Please try again.",
            mathematical_logic: "Unable to fully assess due to processing error. Please try again.",
            clarity_of_thought: "Unable to fully assess due to processing error. Please try again.",
            overall: "There was an issue processing your interview. Please try conducting another interview for a complete assessment.",
            band_assessment: "Processing error - assessment incomplete. Please retry."
          }
        };
      } else {
        feedbackData = {
          personal_insight_score: 3,
          reasoning_score: 3,
          extracurricular_score: 3,
          current_awareness_score: 3,
          total_score: 12,
          detailed_feedback: {
            personal_insight: "Unable to fully assess due to processing error. Please try again.",
            reasoning: "Unable to fully assess due to processing error. Please try again.",
            extracurricular: "Unable to fully assess due to processing error. Please try again.",
            current_awareness: "Unable to fully assess due to processing error. Please try again.",
            overall: "There was an issue processing your interview. Please try conducting another interview for a complete assessment.",
            band_assessment: "Processing error - assessment incomplete. Please retry."
          }
        };
      }
      
      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log('Using fallback feedback data');
      }
    }

    // Generate annotated highlights for the transcript (Student-only)
    let annotations: any[] = [];
    
    // Helper function to split transcript into segments for better coverage
    const splitTranscriptIntoSegments = (transcript: string, numSegments: number = 4) => {
      const lines = transcript.split('\n');
      const studentLines = lines.filter(line => line.trim().startsWith('Student:'));
      const segmentSize = Math.ceil(studentLines.length / numSegments);
      
      const segments = [];
      for (let i = 0; i < numSegments; i++) {
        const startIdx = i * segmentSize;
        const endIdx = Math.min((i + 1) * segmentSize, studentLines.length);
        const segmentLines = studentLines.slice(startIdx, endIdx);
        
        if (segmentLines.length > 0) {
          // Find the position of these lines in the original transcript
          const firstLine = segmentLines[0];
          const lastLine = segmentLines[segmentLines.length - 1];
          const startPos = transcript.indexOf(firstLine);
          const endPos = transcript.indexOf(lastLine) + lastLine.length;
          
          segments.push({
            content: transcript.substring(startPos, endPos),
            segmentNumber: i + 1,
            totalSegments: numSegments,
            expectedAnnotations: Math.ceil(8 / numSegments) // Aim for 8-10 annotations per segment
          });
        }
      }
      return segments;
    };

    try {
      const segments = splitTranscriptIntoSegments(sanitizedTranscription, 4);
      console.log(`Processing ${segments.length} transcript segments for comprehensive annotation coverage`);
      
      // Process each segment separately to ensure full coverage
      for (const segment of segments) {
        const segmentAnnotationPrompt = `You are an expert speaking examiner. Analyze ONLY this specific segment (${segment.segmentNumber}/${segment.totalSegments}) of the student's interview transcript.

CRITICAL INSTRUCTIONS:
- Extract exactly ${segment.expectedAnnotations}-${segment.expectedAnnotations + 2} annotations from ONLY the Student lines in this segment
- Categories: "strength", "grammar", "fluency", "lexical" (aim for 2-3 annotations per category)
- For each quote, provide: { "quote": string, "category": string, "explanation": string, "suggestion": string, "start": number, "end": number }
- start/end are 0-based character offsets into the FULL ORIGINAL transcript (not just this segment)
- Focus on this segment only - do not analyze other parts of the conversation
- Be thorough and granular: annotate specific words, phrases, grammatical structures, vocabulary choices
- Return ONLY valid JSON: { "annotations": Annotation[] }

Segment to analyze:`;

        const segmentRequest = {
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: segmentAnnotationPrompt },
            { role: 'user', content: `${segment.content}\n\nFull transcript for character index reference:\n${sanitizedTranscription}` }
          ],
          temperature: 0,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        };

        try {
          const segmentResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(segmentRequest),
          });

          if (segmentResp.ok) {
            const segmentData = await segmentResp.json();
            const segmentText = (segmentData.choices?.[0]?.message?.content || '').trim();
            
            try {
              const parsed = JSON.parse(segmentText);
              if (parsed && Array.isArray(parsed.annotations)) {
                annotations.push(...parsed.annotations);
                console.log(`Added ${parsed.annotations.length} annotations from segment ${segment.segmentNumber}`);
              }
            } catch (_) {
              const match = segmentText.match(/\{[\s\S]*\}/);
              if (match) {
                try {
                  const parsed = JSON.parse(match[0]);
                  if (parsed && Array.isArray(parsed.annotations)) {
                    annotations.push(...parsed.annotations);
                  }
                } catch { /* ignore */ }
              }
            }
          } else {
            console.warn(`Segment ${segment.segmentNumber} annotation API error:`, segmentResp.status);
          }
        } catch (e) {
          console.warn(`Segment ${segment.segmentNumber} annotation failed:`, e?.message || e);
        }
      }

      console.log(`Total annotations generated from all segments: ${annotations.length}`);
      
    } catch (e) {
      console.warn('Segmented annotation generation failed, falling back to single request:', e?.message || e);
      
      // Fallback to original single-request method with increased token limit
      const fallbackAnnotationPrompt = `You are an expert speaking examiner providing comprehensive feedback. Given a transcript string, extract quoted spans from ONLY the Student's lines throughout the ENTIRE conversation.

CRITICAL: You MUST provide exactly 30-35 annotations to give thorough feedback coverage across the ENTIRE transcript.

- Categories: "strength", "grammar", "fluency", "lexical"
- IMPORTANT: For each quote, COPY the exact substring from the transcript (preserve casing/punctuation/spacing) and include character indexes.
- For each item provide: { "quote": string, "category": one of the four, "explanation": string, "suggestion": string, "start": number, "end": number }
- start/end are 0-based character offsets into the full transcript string, such that transcript.slice(start, end) === quote.
- SYSTEMATIC ANALYSIS REQUIRED:
  * Process the conversation chronologically from beginning to end
  * Ensure annotations are distributed throughout: early (25%), early-middle (25%), late-middle (25%), end (25%)
  * Every student response should have multiple annotations
  * Analyze vocabulary, grammar, fluency, and strengths in each section
- Ensure balanced distribution: ~8-9 annotations per category (strength, grammar, fluency, lexical)
- Return ONLY valid JSON with shape: { "annotations": Annotation[] }`;

      const fallbackRequest = {
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: fallbackAnnotationPrompt },
          { role: 'user', content: `Transcript to annotate (only highlight Student lines):\n\n${sanitizedTranscription}` }
        ],
        temperature: 0,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      };

      try {
        const fallbackResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fallbackRequest),
        });

        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          const fallbackText = (fallbackData.choices?.[0]?.message?.content || '').trim();
          try {
            const parsed = JSON.parse(fallbackText);
            if (parsed && Array.isArray(parsed.annotations)) {
              annotations = parsed.annotations;
            }
          } catch (_) {
            const match = fallbackText.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                if (parsed && Array.isArray(parsed.annotations)) {
                  annotations = parsed.annotations;
                }
              } catch { /* ignore */ }
            }
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback annotation generation failed:', fallbackError?.message || fallbackError);
      }
    }

    // Post-process annotations: normalize categories, compute indices constrained to Student lines, and constrain to transcript bounds
    const allowedCategories = new Set(['strength', 'grammar', 'fluency', 'lexical']);
    const normalizeCategory = (c: string) => {
      const s = String(c || '').toLowerCase();
      if (s.includes('lexical')) return 'lexical';
      if (s.includes('grammar')) return 'grammar';
      if (s.includes('fluency')) return 'fluency';
      if (s.includes('strength') || s.includes('good') || s.includes('strong') || s.includes('positive')) return 'strength';
      return 'grammar';
    };

    // Build ranges that only include the Student's responses in the full transcript
    const buildStudentRanges = (text: string) => {
      const ranges: Array<{ start: number; end: number }> = [];
      try {
        const re = /(^|\n)Student:\s?([\s\S]*?)(?=(\nInterviewer:)|$)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const prefixLen = (m[1] || '').length; // '' or '\n'
          const labelLen = 'Student:'.length;
          let start = (m.index || 0) + prefixLen + labelLen;
          if (text[start] === ' ') start += 1; // skip single space after label if present
          const content = m[2] || '';
          const end = start + content.length;
          if (end > start) ranges.push({ start, end });
        }
      } catch {}
      return ranges;
    };

    const studentRanges = buildStudentRanges(sanitizedTranscription);

    const isWithinStudentRange = (start: number, end: number) => {
      return studentRanges.some(r => start >= r.start && end <= r.end);
    };

    const computeIndex = (quote: string) => {
      if (!quote) return null as any;
      const tryInRange = (segStart: number, segEnd: number) => {
        const segment = sanitizedTranscription.slice(segStart, segEnd);
        let idx = segment.indexOf(quote);
        if (idx !== -1) return { start: segStart + idx, end: segStart + idx + quote.length };
        idx = segment.toLowerCase().indexOf(quote.toLowerCase());
        if (idx !== -1) return { start: segStart + idx, end: segStart + idx + quote.length };
        try {
          const words = quote.trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (words.length) {
            const re = new RegExp(words.join('\\W+'), 'i');
            const m = re.exec(segment);
            if (m && typeof m.index === 'number') {
              return { start: segStart + m.index, end: segStart + m.index + m[0].length };
            }
          }
        } catch {}
        return null as any;
      };
      for (const r of studentRanges) {
        const pos = tryInRange(r.start, r.end);
        if (pos) return pos;
      }
      // Final fallback (should rarely be used)
      const exact = sanitizedTranscription.indexOf(quote);
      if (exact !== -1) return { start: exact, end: exact + quote.length };
      const ci = sanitizedTranscription.toLowerCase().indexOf(quote.toLowerCase());
      if (ci !== -1) return { start: ci, end: ci + quote.length };
      return null as any;
    };

    const sanitizeAnnotation = (a: any) => {
      const quote = typeof a?.quote === 'string' ? a.quote : '';
      let start = Number.isFinite(a?.start) ? a.start : undefined as number | undefined;
      let end = Number.isFinite(a?.end) ? a.end : undefined as number | undefined;

      // If provided indices are invalid or outside student ranges, recompute
      const providedValid = Number.isFinite(start) && Number.isFinite(end) && (end as number) > (start as number) && isWithinStudentRange(start as number, end as number) && sanitizedTranscription.slice(start as number, end as number).length > 0;
      if (!providedValid) {
        const pos = computeIndex(quote);
        if (pos) { start = pos.start; end = pos.end; }
      }

      // Final validation
      if (!(Number.isFinite(start) && Number.isFinite(end) && (end as number) > (start as number))) return null;
      if (!isWithinStudentRange(start as number, end as number)) return null;

      const categoryRaw = (a?.category ?? '') as string;
      const category = allowedCategories.has(categoryRaw as any) ? categoryRaw : normalizeCategory(categoryRaw);
      const explanation = typeof a?.explanation === 'string' ? a.explanation : '';
      const suggestion = typeof a?.suggestion === 'string' ? a.suggestion : undefined;
      return { quote: quote || sanitizedTranscription.slice(start as number, end as number), category, explanation, suggestion, start, end };
    };

    annotations = Array.isArray(annotations) ? annotations : [];
    annotations = annotations
      .map(sanitizeAnnotation)
      .filter((a: any) => !!a)
      .slice(0, 30) as any[];

    // If still empty, try a backup generation pass limited to Student content only
    if (annotations.length === 0) {
      try {
        const backupPrompt = `Extract 15 to 25 quotes from ONLY Student lines throughout the ENTIRE transcript that reflect strengths or issues. Analyze the complete conversation systematically from beginning to end. Categories: strength, grammar, fluency, lexical. Ensure good distribution across all categories and conversation portions. Respond ONLY as {"annotations":[{quote,category,explanation,suggestion,start,end}]}. Ensure start/end are indices into the ORIGINAL transcript string you see below, not a cleaned version. Preserve exact spacing and punctuation.`;
        const backupReq = {
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: backupPrompt },
            { role: 'user', content: `Original Transcript (includes Interviewer labels):\n\n${sanitizedTranscription}` }
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        } as const;
        const backupRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(backupReq),
        });
        if (backupRes.ok) {
          const b = await backupRes.json();
          const txt = (b.choices?.[0]?.message?.content || '').trim();
          try {
            const parsed = JSON.parse(txt);
            if (parsed && Array.isArray(parsed.annotations)) {
              annotations = parsed.annotations.map(sanitizeAnnotation).filter((a: any) => !!a);
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Backup annotations generation failed:', (e as any)?.message || e);
      }
    }

    // Generate overall improvement feedback
    let overallImprovementFeedback = '';
    try {
      const improvementSystemPrompt = `You are an experienced teacher providing constructive feedback to help students improve their interview performance.

Create feedback using this exact format:

**What went well**
[Write exactly 5 sentences about what the student did well, focusing on specific strengths and positive aspects of their performance. Sound like a supportive teacher giving genuine praise for concrete achievements.]

**Even better if**
[Write exactly 5 sentences with actionable next steps based on areas that need improvement. Each sentence should be a specific, practical action they can take. Sound like a teacher guiding them toward improvement.]

Use encouraging, teacher-like language throughout. Be specific about what they did well and what concrete steps they can take to improve.

STUDENT PERFORMANCE DATA:`;

      const improvementRequest = {
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: improvementSystemPrompt },
          { role: 'user', content: `Scores: ${JSON.stringify(feedbackData)}\n\nDetailed Feedback: ${JSON.stringify(feedbackData.detailed_feedback)}\n\nPlease create a comprehensive action plan for this student's improvement.` }
        ],
        max_tokens: 800,
      };

      console.log('Generating overall improvement feedback...');
      const improvementResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(improvementRequest),
      });

      if (improvementResponse.ok) {
        const improvementData = await improvementResponse.json();
        overallImprovementFeedback = improvementData.choices[0]?.message?.content || '';
        console.log('Generated overall improvement feedback:', overallImprovementFeedback.substring(0, 200) + '...');
      } else {
        const errorText = await improvementResponse.text();
        console.error('Failed to generate improvement feedback:', errorText);
        overallImprovementFeedback = `Based on your performance, here are key areas for improvement:\n\n• Review the detailed feedback above for specific guidance on each assessment criteria\n• Practice expressing your thoughts more clearly and confidently\n• Focus on the areas where you scored lower to maximize your improvement\n• Consider doing additional practice interviews to build your skills\n\nKeep practicing - every interview is a step toward success!`;
      }
    } catch (improvementError) {
      console.error('Error generating improvement feedback:', improvementError);
      overallImprovementFeedback = `Based on your performance, here are key areas for improvement:\n\n• Review the detailed feedback above for specific guidance on each assessment criteria\n• Practice expressing your thoughts more clearly and confidently\n• Focus on the areas where you scored lower to maximize your improvement\n• Consider doing additional practice interviews to build your skills\n\nKeep practicing - every interview is a step toward success!`;
    }

    // Attach raw transcription and annotations to response
    feedbackData.transcription = sanitizedTranscription;
    feedbackData.annotations = annotations;
    feedbackData.overall_improvement_feedback = overallImprovementFeedback;
    feedbackData.questions_review = questionsReview;
    // Build flexible scores object for new JSONB column
    const config = INTERVIEW_TYPES[interviewType] || INTERVIEW_TYPES['11-plus'];
    const flexibleScores: Record<string, number> = {};
    
    // Generate criteria keys and map scores (reserved for future use)
    const criteriaKeys = config.scoringCriteria.map((criteria: string) => 
      criteria.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );
    
    flexibleScores.personal_insight_self_awareness = feedbackData.personal_insight_score;
    flexibleScores.reasoning_problem_solving = feedbackData.reasoning_score;
    flexibleScores.extracurricular_activities_leadership = feedbackData.extracurricular_score;
    flexibleScores.current_awareness_curiosity = feedbackData.current_awareness_score;

    // Prepare data for DB insert (ensure integer total_score for schema)
    const dbTotalScore = Number.isFinite(feedbackData.total_score)
      ? Math.round(feedbackData.total_score)
      : null;

    // Save feedback to database with flexible scoring
    const insertData: any = {
      user_id: userId,
      interview_session_id: sessionId || `session_${Date.now()}`,
      session_reference: sessionReference || null, // Add session reference to the feedback
      transcription: sanitizedTranscription,
      total_score: dbTotalScore,
      detailed_feedback: feedbackData.detailed_feedback,
      feedback_content: JSON.stringify(feedbackData.detailed_feedback),
      interview_type: interviewType || '11-plus',
      interview_category: config.category, 
      scoring_system: config.scoringSystem,
      scores: flexibleScores, // New flexible JSONB scores
      annotations: annotations,
      overall_improvement_feedback: overallImprovementFeedback,
      questions_review: questionsReview,
    };

    // Keep legacy columns for backward compatibility based on interview type
    if (interviewType === 'logic-puzzles' || interviewType === 'maths-interview' || interviewType === 'verbal-interview' || interviewType === 'current-affairs-interview') {
      insertData.pattern_recognition_score = feedbackData.pattern_recognition_score;
      insertData.logical_deduction_score = feedbackData.logical_deduction_score;
      insertData.mathematical_logic_score = feedbackData.mathematical_logic_score;
      insertData.clarity_of_thought_score = feedbackData.clarity_of_thought_score;
      insertData.rating = Math.min(5, Math.max(1, Math.round(feedbackData.total_score / 4))); // Convert to 1-5 scale
    } else {
      insertData.personal_insight_score = feedbackData.personal_insight_score;
      insertData.reasoning_score = feedbackData.reasoning_score;
      insertData.extracurricular_score = feedbackData.extracurricular_score;
      insertData.current_awareness_score = feedbackData.current_awareness_score;
      insertData.rating = Math.min(5, Math.max(1, Math.round(feedbackData.total_score / 4))); // Convert to 1-5 scale
    }

    const { data: feedbackRecord, error: insertError } = await supabase
      .from('feedback')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn('Database insert warning:', insertError.message);
      // Do not fail the request; return the generated feedback so the UI can display it
    }

    return new Response(JSON.stringify(feedbackData), {
      headers: securityHeaders,
    });

  } catch (error) {
    console.error('Error in generate-interview-feedback function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      },
    });
  }
});