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
  llmId: string;
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

    const { personaConfig }: { personaConfig: PersonaConfig } = await req.json();

    console.log('Getting Anam session token for persona:', personaConfig.name);

    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anamApiKey}`,
      },
      body: JSON.stringify({
        personaConfig,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anam API error:', response.status, response.statusText, errorText);
      throw new Error(`Anam API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully obtained Anam session token');

    return new Response(JSON.stringify({ sessionToken: data.sessionToken }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-anam-session-token function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});