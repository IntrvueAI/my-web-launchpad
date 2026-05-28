import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BugReportRequest {
  subject: string;
  category: string;
  description: string;
  stepsToReproduce?: string;
  currentUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Log incoming request
  console.log('🔧 [EdgeFunction] Received request:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get("Authorization"),
    authHeaderPreview: req.headers.get("Authorization")?.substring(0, 30) + '...'
  });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('🔧 [EdgeFunction] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    console.log('🔧 [EdgeFunction] Auth header check:', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length || 0,
      authHeaderStart: authHeader?.substring(0, 20) || 'missing'
    });

    if (!authHeader) {
      console.error('🔧 [EdgeFunction] Missing authorization header');
      throw new Error("Missing authorization header");
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log('🔧 [EdgeFunction] Environment variables check:', {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrl: supabaseUrl || 'MISSING',
      hasSupabaseKey: !!supabaseKey,
      supabaseKeyPreview: supabaseKey?.substring(0, 20) + '...' || 'MISSING'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('🔧 [EdgeFunction] Missing Supabase environment variables');
      throw new Error("Server configuration error");
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('🔧 [EdgeFunction] Token extracted, length:', token.length);

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔧 [EdgeFunction] Supabase client created, verifying user with token...');

    // Pass token directly to getUser() - this is the correct pattern
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    console.log('🔧 [EdgeFunction] User verification result:', {
      hasUser: !!userData?.user,
      userId: userData?.user?.id,
      userEmail: userData?.user?.email,
      hasError: !!userError,
      errorMessage: userError?.message
    });

    if (userError || !userData?.user) {
      console.error('🔧 [EdgeFunction] User verification failed:', userError);
      throw new Error("Unauthorized");
    }

    const user = userData.user;

    // Server-side rate limit: max 5 bug reports per hour per user
    const serviceClient = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: reportCount } = await serviceClient
      .from("user_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);
    if ((reportCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 5 bug reports per hour." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate request body
    const { subject, category, description, stepsToReproduce, currentUrl }: BugReportRequest = await req.json();

    // Basic validation
    if (!subject || subject.length > 100) {
      throw new Error("Invalid subject");
    }
    if (!category) {
      throw new Error("Category is required");
    }
    if (!description || description.length > 1000) {
      throw new Error("Invalid description");
    }
    if (stepsToReproduce && stepsToReproduce.length > 500) {
      throw new Error("Steps to reproduce is too long");
    }

    // Prepare bug report data
    const bugReportData = {
      description,
      stepsToReproduce: stepsToReproduce || null,
      category,
      currentUrl,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
    };

    // Store in database
    const { error: dbError } = await supabase
      .from("user_feedback")
      .insert({
        user_id: user.id,
        category: "bug_report",
        subject: subject,
        message: JSON.stringify(bugReportData),
        status: "new",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store bug report");
    }

    // Format category for display
    const categoryDisplay = category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Send email notification to admin
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF7F50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background-color: #e0e0e0; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #555; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #666; margin-bottom: 5px; }
            .value { background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #FF7F50; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐛 Bug Report Received</h1>
            </div>
            <div class="content">
              <div class="section">
                <div class="label">Category</div>
                <div><span class="badge">${categoryDisplay}</span></div>
              </div>

              <div class="section">
                <div class="label">Subject</div>
                <div class="value">${subject}</div>
              </div>

              <div class="section">
                <div class="label">User Email</div>
                <div class="value">${user.email}</div>
              </div>

              <div class="section">
                <div class="label">Current Page</div>
                <div class="value">${currentUrl}</div>
              </div>

              <div class="section">
                <div class="label">Description</div>
                <div class="value">${description.replace(/\n/g, '<br>')}</div>
              </div>

              ${stepsToReproduce ? `
              <div class="section">
                <div class="label">Steps to Reproduce</div>
                <div class="value">${stepsToReproduce.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}

              <div class="footer">
                <p>Submitted: ${new Date().toLocaleString()}</p>
                <p>This is an automated notification from Intrvue.ai Bug Report System</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Intrvue.ai Bug Reports <onboarding@resend.dev>",
      to: ["ibrahim@khan.cc"],
      subject: `🐛 Bug Report: ${subject}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Bug report submitted successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bug-report function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred while processing your bug report"
      }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
