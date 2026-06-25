import { createClient } from "@/lib/supabase/client";

export const TASK_ATTACHMENTS_BUCKET = "voicenotes";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type PendingAttachment = {
  id: string;
  file: File;
  kind: "file" | "voice";
};

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentPublicUrl(filePath: string) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}
