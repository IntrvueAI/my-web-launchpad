import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const { transcription, sessionId, userId, interviewType, interviewCategory, scoringSystem } = inputBody;

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

    // Sanitize and validate transcription length
    const sanitizedTranscription = transcription.trim();
    if (sanitizedTranscription.length < 10) {
      return new Response(JSON.stringify({ error: 'Transcription too short for meaningful analysis' }), {
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

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dynamic system prompt based on interview type
    const systemPrompt = getSystemPrompt(interviewType || '11-plus', scoringSystem || '0-5');

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Preparing OpenAI request...');
      console.log('Transcription length:', sanitizedTranscription.length);
    }

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Evaluate this interview transcription and return ONLY valid JSON with the required fields.\n\n${sanitizedTranscription}` }
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
      
      if (!feedbackData.detailed_feedback || typeof feedbackData.detailed_feedback !== 'object') {
        throw new Error('Missing or invalid detailed_feedback object');
      }
      
    } catch (e) {
      console.error('JSON parsing error:', e.message);
      
      // Create a fallback response for 11+ interviews
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
      
      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log('Using fallback feedback data');
      }
    }

    // Generate annotated highlights for the transcript (Student-only)
    let annotations: any[] = [];
    try {
      const annotationSystemPrompt = `You are an expert speaking examiner providing comprehensive feedback. Given a transcript string, extract quoted spans from ONLY the Student's lines throughout the ENTIRE conversation.

- Categories: "strength", "grammar", "fluency", "lexical"
- IMPORTANT: For each quote, COPY the exact substring from the transcript (preserve casing/punctuation/spacing) and include character indexes.
- For each item provide: { "quote": string, "category": one of the four, "explanation": string, "suggestion": string, "start": number, "end": number }
- start/end are 0-based character offsets into the full transcript string, such that transcript.slice(start, end) === quote.
- Keep quotes varied in length (2-20 words) to cover different aspects. Return between 15 and 25 items to provide comprehensive coverage.
- Analyze the ENTIRE student transcript systematically:
  * Beginning, middle, and end portions
  * Different types of responses (short answers, longer explanations)
  * Various grammatical structures used
  * Vocabulary choices throughout
  * Fluency patterns across the conversation
  * Both strengths and areas for improvement
- Ensure good distribution across all four categories
- Return ONLY valid JSON with shape: { "annotations": Annotation[] }`;

      const annotationRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: annotationSystemPrompt },
          { role: 'user', content: `Transcript to annotate (only highlight Student lines):\n\n${sanitizedTranscription}` }
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      };

      const annotationResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationRequest),
      });

      if (annotationResp.ok) {
        const annData = await annotationResp.json();
        const annText = (annData.choices?.[0]?.message?.content || '').trim();
        try {
          const parsed = JSON.parse(annText);
          if (parsed && Array.isArray(parsed.annotations)) {
            annotations = parsed.annotations;
          }
        } catch (_) {
          const match = annText.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed && Array.isArray(parsed.annotations)) {
                annotations = parsed.annotations;
              }
            } catch { /* ignore */ }
          }
        }
      } else {
        console.warn('Annotation API error status:', annotationResp.status);
      }
    } catch (e) {
      console.warn('Annotation generation failed:', e?.message || e);
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
          model: 'gpt-4o',
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

    // Attach raw transcription and annotations to response
    feedbackData.transcription = sanitizedTranscription;
    feedbackData.annotations = annotations;
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
      transcription: sanitizedTranscription,
      total_score: dbTotalScore,
      detailed_feedback: feedbackData.detailed_feedback,
      feedback_content: JSON.stringify(feedbackData.detailed_feedback),
      interview_type: interviewType || '11-plus',
      interview_category: config.category, 
      scoring_system: config.scoringSystem,
      scores: flexibleScores, // New flexible JSONB scores
      annotations: annotations,
    };

    // Keep legacy columns for backward compatibility
    insertData.personal_insight_score = feedbackData.personal_insight_score;
    insertData.reasoning_score = feedbackData.reasoning_score;
    insertData.extracurricular_score = feedbackData.extracurricular_score;
    insertData.current_awareness_score = feedbackData.current_awareness_score;
    insertData.rating = Math.min(5, Math.max(1, Math.round(feedbackData.total_score / 4))); // Convert to 1-5 scale

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