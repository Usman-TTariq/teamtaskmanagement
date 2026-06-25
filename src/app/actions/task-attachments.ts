"use server";

import { requireLead } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_ATTACHMENT_BYTES,
  TASK_ATTACHMENTS_BUCKET,
} from "@/lib/task-attachments";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
}

export async function uploadAttachmentsForTask(
  taskId: string,
  uploadedBy: string,
  formData: FormData,
) {
  const admin = createAdminClient();

  const files = formData.getAll("files").filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (!files.length) {
    return { error: null as string | null };
  }

  const results = await Promise.all(
    files.map(async (file, index) => {
      const kindRaw = formData.get(`kind:${index}`);
      const kind = kindRaw === "voice" ? "voice" : "file";

      if (file.size > MAX_ATTACHMENT_BYTES) {
        return { error: `"${file.name}" is over 5MB.` };
      }

      const safeName = sanitizeFileName(file.name);
      const path = `${taskId}/${crypto.randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const contentType =
        kind === "voice"
          ? file.type.startsWith("audio/")
            ? file.type
            : "audio/webm"
          : file.type || "application/octet-stream";

      const { error: uploadError } = await admin.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .upload(path, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { error: insertError } = await admin.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: uploadedBy,
        file_name: file.name,
        file_path: path,
        kind,
        mime_type: contentType,
        size_bytes: file.size,
      });

      if (insertError) {
        await admin.storage.from(TASK_ATTACHMENTS_BUCKET).remove([path]);
        return { error: insertError.message };
      }

      return { error: null as string | null };
    }),
  );

  const failed = results.find((result) => result.error);
  return { error: failed?.error ?? null };
}

export async function uploadTaskAttachmentsAction(
  taskId: string,
  formData: FormData,
) {
  const profile = await requireLead();
  const result = await uploadAttachmentsForTask(taskId, profile.id, formData);

  if (result.error) {
    return result;
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/all");
  revalidatePath("/board");
  revalidatePath("/");
  revalidatePath("/mine");
  revalidatePath("/team");

  return { error: null };
}
