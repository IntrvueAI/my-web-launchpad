-- Create function to allow users to delete their own account
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete the user's profile (will cascade from auth deletion anyway, but explicit is better)
  DELETE FROM public.profiles WHERE id = auth.uid();
  
  -- Delete the user from auth.users
  -- Note: This requires the function to be called by the authenticated user
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;