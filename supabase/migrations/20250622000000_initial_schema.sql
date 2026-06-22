-- Team Tasks Manager — initial schema

CREATE TYPE public.user_role AS ENUM (
  'Manager',
  'Team Lead',
  'Developer',
  'Designer',
  'SEO'
);

CREATE TYPE public.task_status AS ENUM (
  'Not Started',
  'In Progress',
  'Blocked',
  'Under Review',
  'Done'
);

CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');

CREATE TYPE public.task_category AS ENUM (
  'Development',
  'Design',
  'SEO',
  'Other'
);

CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'changes');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'Developer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  category public.task_category NOT NULL DEFAULT 'Development',
  assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  priority public.task_priority NOT NULL DEFAULT 'Medium',
  status public.task_status NOT NULL DEFAULT 'Not Started',
  deadline DATE,
  estimated_hours NUMERIC(6, 2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hidden BOOLEAN NOT NULL DEFAULT false,
  visible_to UUID[] DEFAULT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  comment TEXT NOT NULL DEFAULT '',
  review_status public.review_status NOT NULL DEFAULT 'pending',
  review_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_brand ON public.tasks(brand_id);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, read);

-- Role helpers (security definer, private to public schema)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_lead_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('Manager', 'Team Lead')
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'Manager'
$$;

CREATE OR REPLACE FUNCTION public.can_view_task(task_row public.tasks)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN task_row.hidden THEN auth.uid() = ANY (COALESCE(task_row.visible_to, ARRAY[]::uuid[]))
    WHEN public.is_lead_or_manager() THEN true
    ELSE task_row.assignee_id = auth.uid()
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', initcap(split_part(NEW.email, '@', 1))),
    COALESCE(
      (NEW.raw_app_meta_data ->> 'role')::public.user_role,
      'Developer'::public.user_role
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self_or_manager"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_manager())
  WITH CHECK (public.is_manager() OR (id = auth.uid() AND role = public.current_user_role()));

CREATE POLICY "brands_select_authenticated"
  ON public.brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "brands_manage_manager"
  ON public.brands FOR ALL
  TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "tasks_select_visible"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.can_view_task(tasks));

CREATE POLICY "tasks_insert_leads"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_lead_or_manager());

CREATE POLICY "tasks_update_visible"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (public.can_view_task(tasks))
  WITH CHECK (public.can_view_task(tasks));

CREATE POLICY "tasks_delete_leads"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.is_lead_or_manager());

CREATE POLICY "comments_select_via_task"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_task(t)
    )
  );

CREATE POLICY "comments_insert_via_task"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_task(t)
    )
  );

CREATE POLICY "submissions_select_via_task"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_task(t)
    )
  );

CREATE POLICY "submissions_insert_assignee"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND t.assignee_id = auth.uid()
        AND public.can_view_task(t)
    )
  );

CREATE POLICY "submissions_update_leads"
  ON public.task_submissions FOR UPDATE
  TO authenticated
  USING (public.is_lead_or_manager())
  WITH CHECK (public.is_lead_or_manager());

CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "activity_log_select_authenticated"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activity_log_insert_authenticated"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Seed brands
INSERT INTO public.brands (name) VALUES
  ('Berg Publisher'),
  ('Soiree Inc.'),
  ('Link Hexa'),
  ('Earnytics'),
  ('Couponro'),
  ('Seempromo'),
  ('Avail Coupon'),
  ('Mimecode'),
  ('Monarch Books'),
  ('Tgt Nexus'),
  ('Miscellaneous');

-- Allowed sign-in emails (profiles created when users first auth)
CREATE TABLE public.allowed_emails (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role public.user_role NOT NULL
);

INSERT INTO public.allowed_emails (email, name, role) VALUES
  ('abdullah.zahid@tgtnexus.net', 'Abdullah', 'Manager'),
  ('gufran.ahmed@tgtnexus.net', 'Gufran', 'Team Lead'),
  ('yasal.khan@tgtnexus.net', 'Yasal', 'Developer'),
  ('usman.tariq@tgtnexus.net', 'Usman', 'Developer'),
  ('hammad.noor@tgtnexus.net', 'Hammad', 'Designer'),
  ('daniyal.naveed@tgtnexus.net', 'Daniyal', 'SEO');

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allowed_emails_select_anon"
  ON public.allowed_emails FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.allowed_emails TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
