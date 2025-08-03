import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Input validation and sanitization
    const inputBody = await req.json();
    const { transcription, sessionId, userId } = inputBody;

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

    const systemPrompt = `You are an expert evaluator for 11+ private school admissions interviews. You MUST respond with valid JSON only.

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
      const requiredFields = ['personal_insight_score', 'reasoning_score', 'extracurricular_score', 'current_awareness_score', 'total_score'];
      for (const field of requiredFields) {
        if (typeof feedbackData[field] !== 'number' || feedbackData[field] < 0 || feedbackData[field] > 5) {
          throw new Error(`Invalid or missing ${field}: must be a number between 0-5`);
        }
      }
      
      if (!feedbackData.detailed_feedback || typeof feedbackData.detailed_feedback !== 'object') {
        throw new Error('Missing or invalid detailed_feedback object');
      }
      
      // Ensure total_score is calculated correctly
      feedbackData.total_score = feedbackData.personal_insight_score + 
                                 feedbackData.reasoning_score + 
                                 feedbackData.extracurricular_score + 
                                 feedbackData.current_awareness_score;
      
    } catch (e) {
      console.error('JSON parsing error:', e.message);
      
      // Create a fallback response
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

    // Save feedback to database with additional validation
    const { data: feedbackRecord, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        interview_session_id: sessionId || `session_${Date.now()}`,
        transcription: sanitizedTranscription,
        personal_insight_score: feedbackData.personal_insight_score,
        reasoning_score: feedbackData.reasoning_score,
        extracurricular_score: feedbackData.extracurricular_score,
        current_awareness_score: feedbackData.current_awareness_score,
        total_score: feedbackData.total_score,
        detailed_feedback: feedbackData.detailed_feedback,
        feedback_content: JSON.stringify(feedbackData.detailed_feedback),
        rating: Math.min(5, Math.max(1, Math.round(feedbackData.total_score / 4))) // Convert to 1-5 scale
      })
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