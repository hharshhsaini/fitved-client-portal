-- 1) Add contact column to pending_trainers table if not exists
ALTER TABLE public.pending_trainers 
ADD COLUMN IF NOT EXISTS contact text;

-- 2) Re-create approve_trainer RPC with support for contact number
CREATE OR REPLACE FUNCTION public.approve_trainer(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_password text,
  p_contact text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into public.trainers
  INSERT INTO public.trainers (user_id, name, email, password, active, contact)
  VALUES (p_user_id, p_name, p_email, p_password, true, p_contact)
  ON CONFLICT (user_id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      password = EXCLUDED.password,
      active = true,
      contact = EXCLUDED.contact;

  -- Ensure trainer role is assigned
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'trainer')
  ON CONFLICT DO NOTHING;

  -- Delete from pending_trainers
  DELETE FROM public.pending_trainers WHERE user_id = p_user_id;
END;
$$;
