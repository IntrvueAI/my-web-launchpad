import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a user-context client to evaluate RLS/policies with the caller's JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Enhanced admin verification with security logging
    const { data: isAdmin, error: adminError } = await supabaseUser.rpc('verify_admin_access_with_logging');
    
    if (adminError || !isAdmin) {
      console.warn(`Unauthorized admin access attempt by user ${user.email} from IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`);
      
      // Log security incident
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: user.id,
          admin_email: user.email!,
          action: 'unauthorized_admin_attempt',
          details: {
            timestamp: new Date().toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
          }
        });
      
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId, action, amount, targetUserEmail } = await req.json();

    if (!userId || !action || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, action, amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Admin ${user.email} attempting to ${action} ${amount} credits for user ${targetUserEmail}`);
    
    // Additional validation: Prevent excessive credit operations
    if (amount > 1000) {
      console.warn(`Admin ${user.email} attempted to ${action} excessive amount: ${amount} credits`);
      return new Response(
        JSON.stringify({ error: 'Credit amount exceeds maximum allowed limit (1000)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get or create credits balance for the user
    const { data: existingBalance, error: balanceError } = await supabase
      .from('credits_balance')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      throw balanceError;
    }

    let newCredits: number;
    
    if (!existingBalance) {
      // Create new balance record
      newCredits = action === 'add' ? amount : 0;
      const { error: insertError } = await supabase
        .from('credits_balance')
        .insert({
          user_id: userId,
          credits: newCredits
        });

      if (insertError) {
        console.error('Error creating balance:', insertError);
        throw insertError;
      }
    } else {
      // Update existing balance
      const currentCredits = existingBalance.credits;
      
      if (action === 'add') {
        newCredits = currentCredits + amount;
      } else if (action === 'remove') {
        newCredits = Math.max(0, currentCredits - amount); // Don't allow negative credits
      } else {
        throw new Error('Invalid action. Must be "add" or "remove"');
      }

      const { error: updateError } = await supabase
        .from('credits_balance')
        .update({ credits: newCredits })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        throw updateError;
      }
    }

    // Log the admin action
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: user.id,
        admin_email: user.email!,
        action: action === 'add' ? 'add_credits' : 'remove_credits',
        target_user_id: userId,
        target_user_email: targetUserEmail,
        details: {
          amount: amount,
          previous_balance: existingBalance?.credits || 0,
          new_balance: newCredits,
          timestamp: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Error logging audit:', auditError);
      // Don't fail the operation if audit logging fails
    }

    console.log(`Successfully ${action}ed ${amount} credits for user ${targetUserEmail}. New balance: ${newCredits}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance: newCredits,
        action: action,
        amount: amount 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Admin credit management error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});