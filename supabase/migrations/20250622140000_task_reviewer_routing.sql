-- Route Under Review tasks to Team Lead (normal) or Manager (confidential)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_reviewer_status
  ON public.tasks(reviewer_id, status)
  WHERE status = 'Under Review';

CREATE OR REPLACE FUNCTION public.can_view_task(task_row public.tasks)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN task_row.hidden THEN
      auth.uid() IN (task_row.created_by, task_row.assignee_id)
      OR (
        task_row.status = 'Under Review'
        AND task_row.reviewer_id = auth.uid()
      )
    ELSE true
  END
$$;

CREATE POLICY "notifications_insert_leads"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_lead_or_manager());
