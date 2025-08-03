import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonaConfig {
  name: string;
  avatarId: string;
  voiceId: string;
  brainType: string;
  systemPrompt: string;
  maxSessionLengthSeconds?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anamApiKey = Deno.env.get('ANAM_API_KEY');
    
    if (!anamApiKey) {
      throw new Error('ANAM_API_KEY is not configured in Supabase secrets');
    }

    // Input validation and sanitization
    const requestBody = await req.json();
    const { personaConfig } = requestBody;

    if (!personaConfig || typeof personaConfig !== 'object') {
      return new Response(JSON.stringify({ error: 'Valid personaConfig is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required persona config fields
    const requiredFields = ['name', 'avatarId', 'voiceId', 'brainType', 'systemPrompt'];
    for (const field of requiredFields) {
      if (!personaConfig[field] || typeof personaConfig[field] !== 'string') {
        return new Response(JSON.stringify({ error: `Valid ${field} is required in personaConfig` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Sanitize system prompt length
    if (personaConfig.systemPrompt.length > 10000) {
      return new Response(JSON.stringify({ error: 'System prompt too long - maximum 10,000 characters allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Getting Anam session token for persona:', personaConfig.name);
    }

    const requestBody = { personaConfig };
    
    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Request body being sent to Anam API:', JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anamApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anam API error:', response.status, response.statusText);
      return new Response(JSON.stringify({ error: 'Failed to generate session token' }), {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        },
      });
    }

    const data = await response.json();
    
    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Successfully obtained Anam session token');
    }

    return new Response(JSON.stringify({ sessionToken: data.sessionToken }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      },
    });
  } catch (error) {
    console.error('Error in get-anam-session-token function:', error.message);
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