import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// System prompts for different interview types
const getSystemPrompt = (interviewType: string, scoringSystem: string): string => {
  if (interviewType === 'ielts') {
    return `You are an **official IELTS Speaking examiner**. Using the **IELTS Speaking Band Descriptors**, evaluate the following interview transcript. Assess **all four criteria** and assign **band scores (0–9)** based on the reference descriptions below.

## Reference Band Descriptions

### 1. Fluency & Coherence
- **Band 9:** Speaks fluently with rare repetition/self-correction; coherent, develops topics fully and naturally.
- **Band 8:** Mostly fluent with occasional hesitation or self-correction; well-structured, connects ideas effectively.
- **Band 7:** Speaks at length with some hesitation or repetition; maintains coherence with occasional loss of flow.
- **Band 6:** Generally maintains flow but with noticeable pauses and hesitation; ideas sometimes lack clear progression.
- **Band 5:** Frequent pauses and self-correction; struggles to develop ideas or link responses coherently.
- **Band 4:** Slow and limited speech with frequent breakdowns; very limited ability to organize ideas.
- **Band 3:** Speaks only in short phrases with long pauses; coherence largely absent.
- **Band 2:** Rarely able to produce connected speech beyond isolated words.
- **Band 1:** No real communication; unable to produce connected speech.
- **Band 0:** Did not attend / no communication attempted.

### 2. Lexical Resource
- **Band 9:** Wide, precise vocabulary; naturally uses uncommon/idiomatic expressions with full flexibility.
- **Band 8:** Broad vocabulary with good precision; occasional inappropriate word choice but meaning unaffected.
- **Band 7:** Sufficient range to discuss topics; occasional errors or lack of flexibility in expression.
- **Band 6:** Limited ability to discuss unfamiliar topics; repetitive vocabulary; occasional word formation errors.
- **Band 5:** Narrow vocabulary; noticeable errors and frequent repetition; struggles to paraphrase.
- **Band 4:** Very limited vocabulary; errors often hinder communication.
- **Band 3:** Basic vocabulary only for simple ideas; frequent breakdowns due to lack of words.
- **Band 2:** Extremely limited vocabulary; communicates with isolated words only.
- **Band 1:** No useful language produced.
- **Band 0:** Did not attend / no communication attempted.

### 3. Grammatical Range & Accuracy
- **Band 9:** Fully natural and accurate grammar; wide range of complex structures with rare slips.
- **Band 8:** Good control of grammar; frequent complex structures with occasional errors.
- **Band 7:** Uses a mix of simple and complex structures; some errors but rarely impede meaning.
- **Band 6:** Some complex sentences attempted but errors frequent; meaning often clear.
- **Band 5:** Reliance on simple sentences; noticeable grammatical errors; limited complexity.
- **Band 4:** Frequent errors in simple structures; complex grammar rarely attempted.
- **Band 3:** Very basic sentence patterns with frequent breakdowns in grammar.
- **Band 2:** Extremely limited control of grammar; single words or fragments only.
- **Band 1:** No usable grammatical structures produced.
- **Band 0:** Did not attend / no communication attempted.

### 4. Pronunciation
- **Band 9:** Effortlessly clear; fully natural rhythm, stress, and intonation; easily understood.
- **Band 8:** Clear pronunciation with minor issues; rarely affects understanding.
- **Band 7:** Generally clear; occasional mispronunciations or influence of first language but communication intact.
- **Band 6:** Understandable but with noticeable mispronunciations and limited control of intonation.
- **Band 5:** Pronunciation occasionally causes difficulty; limited ability to use stress and rhythm naturally.
- **Band 4:** Pronunciation frequently hinders understanding; strong L1 influence.
- **Band 3:** Speech mostly unintelligible; many sounds mispronounced.
- **Band 2:** Barely intelligible; isolated words recognized with difficulty.
- **Band 1:** No intelligible speech produced.
- **Band 0:** Did not attend / no communication attempted.

CRITICAL: You MUST respond ONLY with a valid JSON object. No explanations, no markdown, no additional text.

Required JSON structure:
{
  "fluency_coherence_score": 0,
  "lexical_resource_score": 0,
  "grammatical_range_score": 0,
  "pronunciation_score": 0,
  "total_score": 0,
  "detailed_feedback": {
    "fluency_coherence": "Brief feedback here",
    "lexical_resource": "Brief feedback here", 
    "grammatical_range": "Brief feedback here",
    "pronunciation": "Brief feedback here",
    "overall": "Overall assessment here",
    "band_assessment": "Overall Band Score explanation here"
  }
}`;
  }
  
  // Default to 11+ prompt
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

    // Reduced logging for production security
    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Preparing OpenAI request...');
      console.log('Transcription length:', sanitizedTranscription.length);
    }

    const requestBody = {
      model: 'gpt-4o',  // Using more widely available model
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        { 
          role: 'user', 
          content: `Evaluate this interview transcription and return ONLY valid JSON:\n\n${sanitizedTranscription}` 
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
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
      if (interviewType === 'ielts') {
        const requiredFields = ['fluency_coherence_score', 'lexical_resource_score', 'grammatical_range_score', 'pronunciation_score', 'total_score'];
        for (const field of requiredFields) {
          if (typeof feedbackData[field] !== 'number' || feedbackData[field] < 0 || feedbackData[field] > 9) {
            throw new Error(`Invalid or missing ${field}: must be a number between 0-9`);
          }
        }
        
        // Ensure total_score is calculated correctly (average for IELTS)
        feedbackData.total_score = Math.round(((feedbackData.fluency_coherence_score + 
                                               feedbackData.lexical_resource_score + 
                                               feedbackData.grammatical_range_score + 
                                               feedbackData.pronunciation_score) / 4) * 2) / 2; // Round to nearest 0.5
      } else {
        // 11+ validation
        const requiredFields = ['personal_insight_score', 'reasoning_score', 'extracurricular_score', 'current_awareness_score', 'total_score'];
        for (const field of requiredFields) {
          if (typeof feedbackData[field] !== 'number' || feedbackData[field] < 0 || feedbackData[field] > 5) {
            throw new Error(`Invalid or missing ${field}: must be a number between 0-5`);
          }
        }
        
        // Ensure total_score is calculated correctly
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
      if (interviewType === 'ielts') {
        feedbackData = {
          fluency_coherence_score: 5,
          lexical_resource_score: 5,
          grammatical_range_score: 5,
          pronunciation_score: 5,
          total_score: 5.0,
          detailed_feedback: {
            fluency_coherence: "Unable to fully assess due to processing error. Please try again.",
            lexical_resource: "Unable to fully assess due to processing error. Please try again.",
            grammatical_range: "Unable to fully assess due to processing error. Please try again.",
            pronunciation: "Unable to fully assess due to processing error. Please try again.",
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

    // Save feedback to database with additional validation
    const insertData: any = {
      user_id: userId,
      interview_session_id: sessionId || `session_${Date.now()}`,
      transcription: sanitizedTranscription,
      total_score: feedbackData.total_score,
      detailed_feedback: feedbackData.detailed_feedback,
      feedback_content: JSON.stringify(feedbackData.detailed_feedback),
      interview_type: interviewType || '11-plus',
      interview_category: interviewCategory || 'academic', 
      scoring_system: scoringSystem || '0-5',
    };

    // Add type-specific scores
    if (interviewType === 'ielts') {
      insertData.fluency_coherence_score = feedbackData.fluency_coherence_score;
      insertData.lexical_resource_score = feedbackData.lexical_resource_score;
      insertData.grammatical_range_score = feedbackData.grammatical_range_score;
      insertData.pronunciation_score = feedbackData.pronunciation_score;
      insertData.rating = Math.min(5, Math.max(1, Math.round(feedbackData.total_score / 2))); // Convert 0-9 to 1-5 scale
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
      .single();

    if (insertError) {
      console.error('Database error:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
        status: 500,
        headers: securityHeaders,
      });
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