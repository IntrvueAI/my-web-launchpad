import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin } });
  }

if (req.method !== "POST") {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
  });
}

try {
  // Auth: require logged-in user and only allow sending to self
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
    });
  }

  const { to, subject, html, from }: EmailRequest = await req.json();

if (!to || !subject || !html) {
  return new Response(
    JSON.stringify({ error: "Missing required fields: to, subject, html" }),
    {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
    }
  );
}

if (to.toLowerCase() !== userData.user.email?.toLowerCase()) {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
  });
}

// Basic size limits
if (subject.length > 200 || html.length > 20000) {
  return new Response(JSON.stringify({ error: "Payload too large" }), {
    status: 413,
    headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
  });
}

const emailResponse = await resend.emails.send({
  from: from || "Intrvue AI <noreply@yourdomain.com>",
  to: [to],
      subject,
      html,
    });

console.log("Email sent successfully:", emailResponse);

return new Response(JSON.stringify(emailResponse), {
  status: 200,
  headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
});
  } catch (error: any) {
    console.error("Error sending email:", error);
return new Response(
  JSON.stringify({ error: error.message }),
  {
    status: 500,
    headers: { "Content-Type": "application/json", ...corsHeaders, "Access-Control-Allow-Origin": origin },
  }
);
  }
};

serve(handler);