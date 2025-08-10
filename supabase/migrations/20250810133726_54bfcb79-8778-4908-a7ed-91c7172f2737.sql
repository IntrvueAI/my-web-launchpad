-- Fix database function security: Add search path protection to all functions
-- This prevents search path attacks

-- Update is_current_user_admin function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid()
  );
END;
$function$;

-- Update get_current_admin_email function
CREATE OR REPLACE FUNCTION public.get_current_admin_email()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT u.email
    FROM auth.users u
    JOIN public.admin_users au ON au.email = u.email
    WHERE u.id = auth.uid()
  );
END;
$function$;

-- Update delete_user function
CREATE OR REPLACE FUNCTION public.delete_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete dependent data first
  DELETE FROM public.feedback WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  
  -- Finally delete the user from auth
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$;

-- Update consume_credit function
CREATE OR REPLACE FUNCTION public.consume_credit()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_rows integer;
BEGIN
  -- Ensure we have an authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Attempt to decrement a credit if available
  UPDATE public.credits_balance
  SET credits = credits - 1
  WHERE user_id = auth.uid()
    AND credits > 0;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 1 THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;

-- Update validate_feedback_scores function
CREATE OR REPLACE FUNCTION public.validate_feedback_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure scores is a valid JSON object
  IF NEW.scores IS NOT NULL AND NOT (NEW.scores ? 'dummy' OR jsonb_typeof(NEW.scores) = 'object') THEN
    RAISE EXCEPTION 'scores must be a valid JSON object';
  END IF;
  
  -- Validate score values are within reasonable range (0-20 to accommodate different systems)
  IF NEW.scores IS NOT NULL THEN
    DECLARE
      key TEXT;
      value INTEGER;
    BEGIN
      FOR key, value IN SELECT * FROM jsonb_each_text(NEW.scores)
      LOOP
        IF value::INTEGER < 0 OR value::INTEGER > 20 THEN
          RAISE EXCEPTION 'Score values must be between 0 and 20, got % for %', value, key;
        END IF;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$;

-- Create enhanced security function for admin data access
CREATE OR REPLACE FUNCTION public.verify_admin_access_with_logging()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email text;
  is_admin_user boolean;
BEGIN
  -- Get current user email
  SELECT email INTO current_user_email
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Check admin status
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    WHERE au.email = current_user_email
  ) INTO is_admin_user;
  
  -- Log admin access attempt
  IF is_admin_user THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      admin_email,
      action,
      details
    ) VALUES (
      auth.uid(),
      current_user_email,
      'admin_data_access',
      jsonb_build_object(
        'timestamp', now(),
        'access_type', 'user_management_view'
      )
    );
  END IF;
  
  RETURN is_admin_user;
END;
$function$;