-- Voice notes on task comments (stored in existing voicenotes bucket)

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS voice_path TEXT,
  ADD COLUMN IF NOT EXISTS voice_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS voice_size_bytes BIGINT
    CHECK (voice_size_bytes IS NULL OR voice_size_bytes > 0);

ALTER TABLE public.task_comments DROP CONSTRAINT IF EXISTS task_comments_voice_fields_check;
ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_voice_fields_check
  CHECK (
    (kind = 'text' AND voice_path IS NULL)
    OR (kind = 'voice' AND voice_path IS NOT NULL)
  );
