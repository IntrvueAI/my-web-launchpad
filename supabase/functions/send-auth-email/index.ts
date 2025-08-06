import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AuthEmailRequest {
  email: string;
  type: 'signup' | 'reset' | 'magic_link';
  token?: string;
  confirmationUrl?: string;
  resetUrl?: string;
  from?: string;
}

const getEmailTemplate = (type: string, data: any) => {
  const baseStyle = `
    <style>
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      .header {
        background: #1976d2;
        color: white;
        padding: 30px;
        text-align: center;
      }
      .content {
        padding: 30px;
        background: white;
      }
      .button {
        display: inline-block;
        background: #1976d2;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
      }
      .footer {
        background: #f8f9fa;
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #666;
      }
    </style>
  `;

  switch (type) {
    case 'signup':
      return `
        ${baseStyle}
        <div class="email-container">
          <div class="header">
            <h1>Welcome to Intrvue AI!</h1>
          </div>
          <div class="content">
            <h2>Confirm your email address</h2>
            <p>Thanks for signing up! Please confirm your email address to get started with your personalized interview practice.</p>
            <a href="${data.confirmationUrl}" class="button">Confirm Email Address</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.confirmationUrl}</p>
            <p>This link will expire in 24 hours for security reasons.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>© 2025 Intrvue AI. All rights reserved.</p>
          </div>
        </div>
      `;
    
    case 'reset':
      return `
        ${baseStyle}
        <div class="email-container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password for your Intrvue AI account.</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
            <p>This link will expire in 1 hour for security reasons.</p>
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>© 2025 Intrvue AI. All rights reserved.</p>
          </div>
        </div>
      `;

    default:
      return `
        ${baseStyle}
        <div class="email-container">
          <div class="header">
            <h1>Intrvue AI</h1>
          </div>
          <div class="content">
            <p>You have received this email from Intrvue AI.</p>
          </div>
          <div class="footer">
            <p>© 2025 Intrvue AI. All rights reserved.</p>
          </div>
        </div>
      `;
  }
};

const getSubject = (type: string) => {
  switch (type) {
    case 'signup':
      return 'Welcome to Intrvue AI - Confirm your email';
    case 'reset':
      return 'Reset your Intrvue AI password';
    case 'magic_link':
      return 'Your Intrvue AI login link';
    default:
      return 'Intrvue AI Notification';
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { email, type, confirmationUrl, resetUrl, from }: AuthEmailRequest = await req.json();

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const html = getEmailTemplate(type, { confirmationUrl, resetUrl });
    const subject = getSubject(type);

    const emailResponse = await resend.emails.send({
      from: from || "Intrvue AI <noreply@yourdomain.com>",
      to: [email],
      subject,
      html,
    });

    console.log("Auth email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending auth email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);