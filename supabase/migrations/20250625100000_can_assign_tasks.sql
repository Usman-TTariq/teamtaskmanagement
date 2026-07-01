-- Per-user task assignment flag (independent of display role)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_assign_tasks boolean NOT NULL DEFAULT false;

ALTER TABLE public.allowed_emails
  ADD COLUMN IF NOT EXISTS can_assign_tasks boolean NOT NULL DEFAULT false;

UPDATE public.allowed_emails
SET can_assign_tasks = true
WHERE role IN ('Manager', 'Team Lead')
   OR lower(email) = 'daniyal.naveed@tgtnexus.net';

UPDATE public.profiles
SET can_assign_tasks = true
WHERE role IN ('Manager', 'Team Lead')
   OR lower(email) = 'daniyal.naveed@tgtnexus.net';

CREATE OR REPLACE FUNCTION public.is_lead_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_assign_tasks FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

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

  INSERT INTO public.profiles (id, email, name, role, can_assign_tasks)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(allowed.name, NEW.raw_user_meta_data ->> 'name', initcap(split_part(NEW.email, '@', 1))),
    COALESCE(
      allowed.role,
      (NEW.raw_app_meta_data ->> 'role')::public.user_role,
      'Developer'::public.user_role
    ),
    COALESCE(allowed.can_assign_tasks, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      can_assign_tasks = EXCLUDED.can_assign_tasks,
      updated_at = now();

  RETURN NEW;
END;
$$;
