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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
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
