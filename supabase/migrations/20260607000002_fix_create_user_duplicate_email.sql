-- Fix create_user function to handle duplicate emails gracefully
-- This prevents the 409 Conflict error when trying to add a user with an existing email

CREATE OR REPLACE FUNCTION public.create_user(
  p_email text,
  p_password text,
  p_role text DEFAULT 'viewer'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user with this email already exists
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = p_email;

  IF existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User with email % already exists', p_email
      USING ERRCODE = 'unique_violation',
            HINT = 'Please use a different email address';
  END IF;

  -- Insert new user
  INSERT INTO public.users (email, password_hash, role)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_role)
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$;
