import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Read required environment variables from Supabase secrets
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Supabase secrets');
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
  const origin = req.headers.get('origin') || '*';
  
  if (!anamApiKey) {
    throw new Error('ANAM_API_KEY is not configured in Supabase secrets');
  }

// Authenticate caller
const authHeader = req.headers.get('Authorization') || '';
const token = authHeader.replace('Bearer ', '');

if (!supabaseUrl || !supabaseAnonKey) {
  return new Response(JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_ANON_KEY' }), {
    status: 500,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const { data: userData, error: userErr } = await supabase.auth.getUser(token);
if (userErr || !userData?.user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

// Rate limit: reject only if the user has a *genuinely concurrent* live session, to
// prevent Anam quota exhaustion. The client creates the active interview_sessions row
// for THIS attempt before requesting a token, so we must ignore freshly-created rows
// (younger than 90s) or every start would block itself. We also ignore rows older than
// 30 minutes: a session can't still be live past the max interview length, so those are
// stale/abandoned rows that should never lock a user out.
const now = Date.now();
const ignoreYoungerThan = new Date(now - 90 * 1000).toISOString();        // this attempt's own row
const ignoreOlderThan = new Date(now - 30 * 60 * 1000).toISOString();     // stale/abandoned rows
const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);

// Self-heal: a genuinely live session is always younger than 90s at this point, so any of the
// user's OWN active sessions older than that are abandoned (tab closed / refreshed without ending).
// Mark them abandoned so they can never lock the user out of starting a new interview.
await supabaseService
  .from('interview_sessions')
  .update({ status: 'abandoned', ended_at: new Date().toISOString() })
  .eq('user_id', userData.user.id)
  .eq('status', 'active')
  .lt('created_at', ignoreYoungerThan);

const { count: activeSessions } = await supabaseService
  .from('interview_sessions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userData.user.id)
  .eq('status', 'active')
  .lt('created_at', ignoreYoungerThan)
  .gt('created_at', ignoreOlderThan);
if ((activeSessions ?? 0) >= 1) {
  return new Response(JSON.stringify({ error: 'You already have an active session. Please end it before starting a new one.' }), {
    status: 429,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

// Input validation and sanitization
const requestBody = await req.json();
const { personaConfig } = requestBody;

if (!personaConfig || typeof personaConfig !== 'object') {
  return new Response(JSON.stringify({ error: 'Valid personaConfig is required' }), {
    status: 400,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

    // Engine-driven (orchestrated) interviews are puppeteered by our interview-brain via talk().
    // Anam's official "bring your own LLM" mode disables its built-in AI so the avatar only speaks
    // the text we send: set llmId="CUSTOMER_CLIENT_V1" and omit any systemPrompt.
    const engineDriven = requestBody.engineDriven === true || personaConfig.engineDriven === true;
    delete personaConfig.engineDriven;
    if (engineDriven) {
      delete personaConfig.brainType;
      personaConfig.llmId = 'CUSTOMER_CLIENT_V1';
      delete personaConfig.systemPrompt;
    }

    // Validate required persona config fields
    const requiredFields = engineDriven
      ? ['name', 'avatarId', 'voiceId', 'llmId']
      : ['name', 'avatarId', 'voiceId', 'brainType', 'systemPrompt'];
for (const field of requiredFields) {
  if (!personaConfig[field] || typeof personaConfig[field] !== 'string') {
    return new Response(JSON.stringify({ error: `Valid ${field} is required in personaConfig` }), {
      status: 400,
      headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
    });
  }
}

    // Sanitize system prompt length. Mini-interviews compose the shared core
    // (interview-logic.md) with a subject brief, so the final prompt runs well
    // past 10k characters — cap generously to leave headroom for that.
if (personaConfig.systemPrompt && personaConfig.systemPrompt.length > 30000) {
  return new Response(JSON.stringify({ error: 'System prompt too long - maximum 30,000 characters allowed' }), {
    status: 400,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

    if (Deno.env.get('NODE_ENV') !== 'production') {
      console.log('Getting Anam session token for persona:', personaConfig.name);
      console.log('Request body being sent to Anam API:', JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anamApiKey}`,
      },
      body: JSON.stringify({ personaConfig }),
    });

if (!response.ok) {
  const errorText = await response.text();
  console.error('Anam API error:', response.status, response.statusText);
  return new Response(JSON.stringify({ error: 'Failed to generate session token' }), {
    status: 500,
    headers: { 
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
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
    'Access-Control-Allow-Origin': origin, 
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  },
});
  } catch (error) {
console.error('Error in get-anam-session-token function:', (error as any).message || error);
return new Response(JSON.stringify({ error: 'Internal server error' }), {
  status: 500,
  headers: { 
    ...corsHeaders, 
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  },
});
  }
});