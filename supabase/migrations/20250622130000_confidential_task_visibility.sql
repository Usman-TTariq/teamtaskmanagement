-- Confidential tasks: only creator + assignee.
-- Non-confidential tasks: visible to the whole team.

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
    ELSE true
  END
$$;
