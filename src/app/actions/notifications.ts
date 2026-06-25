"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification, Profile } from "@/lib/types";

function revalidateAppShell() {
  revalidatePath("/", "layout");
}

export async function getUnreadNotificationCountForProfile(
  profile: Profile,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .eq("read", false);

  return count ?? 0;
}

export async function getRecentNotifications(): Promise<AppNotification[]> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, message, task_id, read, created_at")
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("getRecentNotifications:", error.message);
    return [];
  }

  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(notificationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("recipient_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidateAppShell();
  return { success: true };
}

export async function markAllNotificationsRead() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", profile.id)
    .eq("read", false);

  if (error) {
    return { error: error.message };
  }

  revalidateAppShell();
  return { success: true };
}
