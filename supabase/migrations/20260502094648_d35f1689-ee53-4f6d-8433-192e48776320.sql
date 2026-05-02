ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob date;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, name, phone, dob)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'dob','')::date
  );
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $function$;