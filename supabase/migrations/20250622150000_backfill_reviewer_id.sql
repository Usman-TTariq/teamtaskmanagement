-- Backfill reviewer_id for tasks submitted before reviewer routing shipped

UPDATE public.tasks t
SET reviewer_id = sub.reviewer_id
FROM (
  SELECT
    task.id AS task_id,
    (
      SELECT p.id
      FROM public.profiles p
      WHERE p.role = (
        CASE WHEN task.hidden THEN 'Manager' ELSE 'Team Lead' END
      )::public.user_role
        AND p.is_active = true
      ORDER BY p.name
      LIMIT 1
    ) AS reviewer_id
  FROM public.tasks task
  WHERE task.status = 'Under Review'
    AND task.reviewer_id IS NULL
) sub
WHERE t.id = sub.task_id
  AND sub.reviewer_id IS NOT NULL;
