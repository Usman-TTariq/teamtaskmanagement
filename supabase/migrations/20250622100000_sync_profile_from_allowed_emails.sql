-- Sync profile role/name from allowed_emails when a user first signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed public.allowed_emails%ROWTYPE;
BEGIN
  SELECT * INTO allowed
  FROM public.allowed_emails
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(allowed.name, NEW.raw_user_meta_data ->> 'name', initcap(split_part(NEW.email, '@', 1))),
    COALESCE(
      allowed.role,
      (NEW.raw_app_meta_data ->> 'role')::public.user_role,
      'Developer'::public.user_role
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      updated_at = now();

  RETURN NEW;
END;
$$;
