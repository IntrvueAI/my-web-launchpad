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
    const { transcription, sessionId, userId } = await req.json();

    if (!transcription || !userId) {
      throw new Error('Transcription and userId are required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const systemPrompt = `You are an expert evaluator for 11+ private school admissions interviews. 

SCORING RUBRIC (Each section scored 1-5, total out of 20):

Section 1: Personal Insight and Expression (5 marks)
- 5: Exceptionally articulate and self-reflective; demonstrates emotional intelligence and authenticity well beyond age expectations
- 4: Confident and clear; offers thoughtful responses grounded in real personal insight
- 3: Reasonably confident; responses may be general or rehearsed but competently delivered
- 2: Hesitant or vague; limited depth or connection to own experience
- 1: Minimal response; lacks reflection, self-awareness, or engagement

Section 2: Reasoning and Intellectual Agility (5 marks)
- 5: Demonstrates elegant and flexible reasoning, explaining their logic clearly even under challenge
- 4: Shows sound logic and perseverance; minor slips in method or expression but good intellectual instinct
- 3: Attempts to reason through problems but may rely on guesswork or lack a clear process
- 2: Struggles with reasoning tasks or retreats quickly from uncertainty
- 1: Unable to engage meaningfully with reasoning questions

Section 3: Extracurricular Engagement and Depth (5 marks)
- 5: Deep, sustained commitment to one or more pursuits; evidence of self-driven learning or leadership
- 4: Strong, consistent engagement in at least one area; speaks with genuine enthusiasm and clarity
- 3: Mentions several activities but without much depth or individual agency
- 2: Involvement appears shallow or externally driven (heavily parent-led)
- 1: No meaningful extracurricular interests mentioned or evident

Section 4: Current Awareness and Moral Reasoning (5 marks)
- 5: Offers a nuanced, thoughtful view on global or ethical matters; demonstrates empathy and conceptual depth
- 4: Aware of major issues and can express a coherent, if developing, perspective
- 3: Basic awareness with limited reasoning or oversimplified conclusions
- 2: Minimal engagement with the world beyond school or family; unclear or confused views
- 1: No relevant awareness or ability to discuss broader issues meaningfully

SCORING BANDS:
18-20: Outstanding candidate; scholarship-level potential
15-17: Strong candidate; likely offer holder at leading academic schools
12-14: Sound performance; has promise but may benefit from development
8-11: Developing; would benefit from further preparation
0-7: Below expected level; needs significant support

TASK: Analyze the interview transcription and provide:
1. A score (1-5) for each section
2. Written feedback for each section explaining the score
3. Overall comments and improvement suggestions
4. Total score and band assessment

Respond in JSON format:
{
  "personal_insight_score": number,
  "reasoning_score": number,
  "extracurricular_score": number,
  "current_awareness_score": number,
  "total_score": number,
  "detailed_feedback": {
    "personal_insight": "specific feedback...",
    "reasoning": "specific feedback...",
    "extracurricular": "specific feedback...",
    "current_awareness": "specific feedback...",
    "overall": "overall assessment and improvement suggestions...",
    "band_assessment": "performance band with explanation..."
  }
}`;

    // Generate feedback using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please evaluate this interview transcription:\n\n${transcription}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const feedbackText = data.choices[0].message.content;
    
    // Parse the JSON response
    let feedbackData;
    try {
      feedbackData = JSON.parse(feedbackText);
    } catch (e) {
      throw new Error('Failed to parse AI response as JSON');
    }

    // Save feedback to database
    const { data: feedbackRecord, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        interview_session_id: sessionId,
        transcription: transcription,
        personal_insight_score: feedbackData.personal_insight_score,
        reasoning_score: feedbackData.reasoning_score,
        extracurricular_score: feedbackData.extracurricular_score,
        current_awareness_score: feedbackData.current_awareness_score,
        total_score: feedbackData.total_score,
        detailed_feedback: feedbackData.detailed_feedback,
        feedback_content: JSON.stringify(feedbackData.detailed_feedback),
        rating: Math.round(feedbackData.total_score) // Convert to 1-5 scale roughly
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error('Failed to save feedback to database');
    }

    return new Response(JSON.stringify(feedbackData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-interview-feedback function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});