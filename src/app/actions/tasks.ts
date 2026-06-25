"use server";

import { revalidatePath } from "next/cache";
import type { TaskCategory, TaskPriority, TaskStatus, UserRole } from "@/lib/constants";
import { requireLead, requireProfile } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamProfiles } from "@/lib/team-profiles";
import { TASK_ATTACHMENTS_BUCKET, MAX_ATTACHMENT_BYTES } from "@/lib/task-attachments";
import { canAssign } from "@/lib/permissions";
import type { Brand, AllTask, BoardTask, DashboardStats, Profile, TaskComment, TaskDetail, TeamMemberWorkload } from "@/lib/types";

function brandNameFromJoin(brand: unknown): string | null {
  if (!brand) return null;
  if (Array.isArray(brand)) {
    return (brand[0] as { name?: string } | undefined)?.name ?? null;
  }
  return (brand as { name?: string }).name ?? null;
}

function profileFromJoin(
  assignee: unknown,
): { id: string; name: string; role: UserRole } | null {
  if (!assignee) return null;
  const row = Array.isArray(assignee) ? assignee[0] : assignee;
  if (!row || typeof row !== "object") return null;
  const profile = row as { id?: string; name?: string; role?: UserRole };
  if (!profile.id || !profile.name || !profile.role) return null;
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
  };
}

function mapBoardTask(row: {
  id: string;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  deadline: string | null;
  hidden: boolean;
  pinned: boolean;
  brand: unknown;
  assignee: unknown;
}): BoardTask | null {
  const assignee = profileFromJoin(row.assignee);
  if (!assignee) return null;

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    category: row.category,
    priority: row.priority,
    deadline: row.deadline,
    hidden: row.hidden,
    pinned: row.pinned,
    brandName: brandNameFromJoin(row.brand),
    assignee,
  };
}

function mapAllTask(row: {
  id: string;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  deadline: string | null;
  hidden: boolean;
  pinned: boolean;
  created_at: string;
  brand_id: string | null;
  brand: unknown;
  assignee: unknown;
}): AllTask | null {
  const base = mapBoardTask(row);
  if (!base) return null;
  return {
    ...base,
    created_at: row.created_at,
    brand_id: row.brand_id,
  };
}

async function fetchTaskRows(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase
    .from("tasks")
    .select(
      "id, title, status, category, priority, deadline, hidden, pinned, created_at, brand_id, brand:brands(name), assignee:profiles!tasks_assignee_id_fkey(id, name, role)",
    )
    .order("created_at", { ascending: false });
}

export type CreateTaskInput = {
  title: string;
  description: string;
  brandId: string;
  category: TaskCategory;
  assigneeId: string;
  priority: TaskPriority;
  deadline: string | null;
  estimatedHours: number | null;
  pinned: boolean;
  hidden: boolean;
};

export async function getTaskFormData(): Promise<{
  brands: Brand[];
  members: Profile[];
}> {
  await requireProfile();
  return getTaskFormDataForProfile();
}

export async function getTaskFormDataForProfile(): Promise<{
  brands: Brand[];
  members: Profile[];
}> {
  const supabase = await createClient();
  const [{ data: brands }, members] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    getTeamProfiles(),
  ]);

  return {
    brands: brands ?? [],
    members,
  };
}

export async function getTeamWorkload(): Promise<TeamMemberWorkload[]> {
  await requireLead();
  const current = await requireProfile();
  const members = (await getTeamProfiles()).filter((m) => m.id !== current.id);

  if (!members.length) return [];

  const memberIds = members.map((m) => m.id);
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, assignee_id, status, deadline, brand:brands(name)",
    )
    .in("assignee_id", memberIds)
    .neq("status", "Done");

  const byAssignee = new Map<string, typeof tasks>();
  for (const task of tasks ?? []) {
    const list = byAssignee.get(task.assignee_id) ?? [];
    list.push(task);
    byAssignee.set(task.assignee_id, list);
  }

  return members.map((member) => {
    const open = byAssignee.get(member.id) ?? [];
    const late = open.filter(
      (t) => t.deadline && t.deadline < today,
    ).length;
    const inProgress = open.find((t) => t.status === "In Progress");
    const currentTask = inProgress ?? open[0] ?? null;

    return {
      profile: member,
      openCount: open.length,
      lateCount: late,
      currentTask: currentTask
        ? {
            id: currentTask.id,
            title: currentTask.title,
            brandName: brandNameFromJoin(currentTask.brand),
            status: currentTask.status,
          }
        : null,
    };
  });
}

export async function createTask(input: CreateTaskInput) {
  const creator = await requireLead();
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) {
    return { error: "Title is required." };
  }
  if (!input.assigneeId) {
    return { error: "Choose who to assign this task to." };
  }
  if (!input.brandId) {
    return { error: "Choose a brand." };
  }

  const visibleTo = input.hidden
    ? [creator.id, input.assigneeId]
    : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: input.description.trim(),
      brand_id: input.brandId,
      category: input.category,
      assignee_id: input.assigneeId,
      priority: input.priority,
      deadline: input.deadline || null,
      estimated_hours: input.estimatedHours,
      pinned: input.pinned,
      hidden: input.hidden,
      visible_to: visibleTo,
      created_by: creator.id,
      status: "Not Started",
    })
    .select("id")
    .single();

  if (error || !task) {
    return {
      error: error?.message ?? "Could not create task. Try again.",
    };
  }

  await supabase.from("activity_log").insert({
    task_id: task.id,
    user_id: creator.id,
    action_type: "created",
    description: `Created task "${title}"`,
  });

  if (input.assigneeId !== creator.id) {
    await notifyUser(
      input.assigneeId,
      task.id,
      `${creator.name} assigned you "${title}"`,
    );
  }

  revalidatePath("/team");
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/all");
  revalidatePath("/mine");

  return { success: true, taskId: task.id };
}

export async function getMyTasks(): Promise<BoardTask[]> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data, error }, unreadTaskIds] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, category, priority, deadline, hidden, pinned, brand:brands(name), assignee:profiles!tasks_assignee_id_fkey(id, name, role)",
      )
      .eq("assignee_id", profile.id)
      .order("created_at", { ascending: false }),
    fetchUnreadTaskIds(supabase, profile.id),
  ]);

  if (error) {
    console.error("getMyTasks:", error.message);
    return [];
  }

  const tasks: BoardTask[] = [];
  for (const row of data ?? []) {
    const task = mapBoardTask(row);
    if (!task) continue;
    tasks.push({
      ...task,
      hasUnreadResponse: unreadTaskIds.has(task.id),
    });
  }
  return tasks;
}

export async function getBoardTasks(): Promise<BoardTask[]> {
  await requireLead();
  const supabase = await createClient();
  const { data, error } = await fetchTaskRows(supabase);

  if (error) {
    console.error("getBoardTasks:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => mapBoardTask(row))
    .filter((task): task is BoardTask => task != null);
}

export async function getAllTasks(): Promise<AllTask[]> {
  await requireLead();
  const supabase = await createClient();
  const { data, error } = await fetchTaskRows(supabase);

  if (error) {
    console.error("getAllTasks:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => mapAllTask(row))
    .filter((task): task is AllTask => task != null);
}

function mapComment(
  row: {
    id: string;
    body: string;
    kind?: string;
    voice_path?: string | null;
    voice_mime_type?: string | null;
    created_at: string;
    author: unknown;
  },
  voiceUrl: string | null = null,
): TaskComment | null {
  const author = profileFromJoin(row.author);
  if (!author) return null;
  const kind = row.kind === "voice" ? "voice" : "text";
  return {
    id: row.id,
    body: row.body,
    kind,
    created_at: row.created_at,
    voiceUrl: kind === "voice" ? voiceUrl : null,
    voiceMimeType:
      kind === "voice"
        ? row.voice_mime_type?.startsWith("audio/")
          ? row.voice_mime_type
          : "audio/webm"
        : null,
    author,
  };
}

function revalidateTaskPaths() {
  revalidatePath("/team");
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/all");
  revalidatePath("/mine");
}

async function resolveReviewer(
  hidden: boolean,
): Promise<
  { error: string } | { reviewer: { id: string; name: string } }
> {
  const admin = createAdminClient();
  const role = hidden ? "Manager" : "Team Lead";

  const { data, error } = await admin
    .from("profiles")
    .select("id, name")
    .eq("role", role)
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { error: `No active ${role} found to review this task.` };
  }

  return { reviewer: data };
}

async function fetchUnreadTaskIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
) {
  const { data } = await supabase
    .from("notifications")
    .select("task_id")
    .eq("recipient_id", profileId)
    .eq("read", false)
    .not("task_id", "is", null);

  return new Set(
    (data ?? [])
      .map((row) => row.task_id)
      .filter((id): id is string => Boolean(id)),
  );
}

async function notifyUser(
  recipientId: string,
  taskId: string,
  message: string,
) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: recipientId,
    task_id: taskId,
    message,
  });
}

async function getPendingSubmissionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
) {
  const { data } = await supabase
    .from("task_submissions")
    .select("id")
    .eq("task_id", taskId)
    .eq("review_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function getTaskDetail(
  taskId: string,
): Promise<{ task: TaskDetail | null; error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id, title, description, status, category, priority, deadline, hidden, pinned,
      assignee_id, created_by, created_at, reviewer_id,
      brand:brands(name),
      assignee:profiles!tasks_assignee_id_fkey(id, name, role),
      reviewer:profiles!tasks_reviewer_id_fkey(id, name, role),
      comments:task_comments(
        id, body, kind, voice_path, voice_mime_type, voice_size_bytes, created_at,
        author:profiles(id, name, role)
      )
    `,
    )
    .eq("id", taskId)
    .order("created_at", {
      referencedTable: "task_comments",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    return { task: null, error: error.message };
  }
  if (!data) {
    return { task: null, error: "Task not found or you do not have access." };
  }

  const base = mapBoardTask(data);
  if (!base) {
    return { task: null, error: "Could not load task." };
  }

  const [{ count }, { data: attachmentRows }, pendingSubmissionId] =
    await Promise.all([
      supabase
        .from("task_submissions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId),
      supabase
        .from("task_attachments")
        .select("id, file_name, file_path, kind, mime_type, size_bytes")
        .eq("task_id", taskId)
        .order("created_at"),
      getPendingSubmissionId(supabase, taskId),
    ]);

  const attachments = await Promise.all(
    (attachmentRows ?? []).map(async (row) => {
      const kind = row.kind as "file" | "voice";
      const mimeType =
        kind === "voice" && !row.mime_type.startsWith("audio/")
          ? "audio/webm"
          : row.mime_type;

      const { data: playback } = await supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.file_path, 3600);

      let downloadUrl: string | null = null;
      if (kind === "file") {
        const { data: download } = await supabase.storage
          .from(TASK_ATTACHMENTS_BUCKET)
          .createSignedUrl(row.file_path, 3600, {
            download: row.file_name,
          });
        downloadUrl = download?.signedUrl ?? null;
      }

      return {
        id: row.id,
        file_name: row.file_name,
        kind,
        mime_type: mimeType,
        size_bytes: row.size_bytes,
        url: playback?.signedUrl ?? null,
        downloadUrl,
      };
    }),
  );

  const comments = await Promise.all(
    (data.comments ?? []).map(async (row) => {
      let voiceUrl: string | null = null;
      if (row.kind === "voice" && row.voice_path) {
        const { data: playback } = await supabase.storage
          .from(TASK_ATTACHMENTS_BUCKET)
          .createSignedUrl(row.voice_path, 3600);
        voiceUrl = playback?.signedUrl ?? null;
      }
      return mapComment(row, voiceUrl);
    }),
  ).then((rows) => rows.filter((c): c is TaskComment => c != null));

  return {
    task: {
      ...base,
      description: data.description ?? "",
      assignee_id: data.assignee_id,
      created_by: data.created_by,
      created_at: data.created_at,
      reviewer_id: data.reviewer_id,
      reviewer: profileFromJoin(data.reviewer),
      pendingSubmissionId,
      comments,
      submissionCount: count ?? 0,
      attachments,
    },
  };
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, assignee_id, status, title")
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) {
    return { error: "Task not found." };
  }

  const isAssignee = existing.assignee_id === profile.id;
  const isLead = canAssign(profile.role);

  if (!isAssignee && !isLead) {
    return { error: "You cannot update this task." };
  }

  if (isAssignee && !isLead && !["Not Started", "In Progress", "Blocked"].includes(status)) {
    return { error: "You can only move tasks to Not Started, In Progress, or Blocked." };
  }

  const patch: Record<string, unknown> = { status };
  if (status === "In Progress" && existing.status === "Not Started") {
    patch.started_at = new Date().toISOString();
  }
  if (status === "Done") {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("activity_log").insert({
    task_id: taskId,
    user_id: profile.id,
    action_type: "status_changed",
    description: `Changed "${existing.title}" to ${status}`,
  });

  revalidateTaskPaths();
  return { success: true };
}

export async function toggleTaskPinned(taskId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, assignee_id, pinned, title")
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) {
    return { error: "Task not found." };
  }

  if (existing.assignee_id !== profile.id && !canAssign(profile.role)) {
    return { error: "You cannot pin this task." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ pinned: !existing.pinned })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidateTaskPaths();
  return { success: true, pinned: !existing.pinned };
}

export async function deleteTask(taskId: string) {
  await requireLead();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/all");
  revalidatePath("/board");
  revalidatePath("/");
  return { success: true as const };
}

export async function submitTaskForReview(taskId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, assignee_id, status, title, hidden")
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) {
    return { error: "Task not found." };
  }
  if (existing.assignee_id !== profile.id) {
    return { error: "Only the assignee can submit for review." };
  }
  if (existing.status === "Under Review" || existing.status === "Done") {
    return { error: "This task is already submitted or completed." };
  }

  const resolved = await resolveReviewer(existing.hidden);
  if ("error" in resolved) {
    return { error: resolved.error };
  }
  const reviewerId = resolved.reviewer.id;

  const { error: submissionError } = await supabase
    .from("task_submissions")
    .insert({
      task_id: taskId,
      author_id: profile.id,
      comment: "",
      review_status: "pending",
    });

  if (submissionError) {
    return { error: submissionError.message };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "Under Review",
      reviewer_id: reviewerId,
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  await notifyUser(
    reviewerId,
    taskId,
    `${profile.name} submitted "${existing.title}" for your review`,
  );

  await supabase.from("activity_log").insert({
    task_id: taskId,
    user_id: profile.id,
    action_type: "submitted",
    description: `Submitted "${existing.title}" for review`,
  });

  revalidateTaskPaths();
  return { success: true };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireLead();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("status, deadline, created_at, completed_at");

  if (error) {
    console.error("getDashboardStats:", error.message);
    return {
      totalTasks: 0,
      addedThisWeek: 0,
      completedCount: 0,
      completedThisWeek: 0,
      overdueCount: 0,
      donePercent: 0,
    };
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let addedThisWeek = 0;
  let completedCount = 0;
  let completedThisWeek = 0;
  let overdueCount = 0;

  for (const row of data ?? []) {
    const createdAt = new Date(row.created_at);
    if (createdAt >= weekAgo) addedThisWeek += 1;

    if (row.status === "Done") {
      completedCount += 1;
      if (row.completed_at && new Date(row.completed_at) >= weekAgo) {
        completedThisWeek += 1;
      }
    } else if (row.deadline) {
      const due = new Date(`${row.deadline}T00:00:00`);
      if (due < today) overdueCount += 1;
    }
  }

  const totalTasks = data?.length ?? 0;
  const donePercent =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return {
    totalTasks,
    addedThisWeek,
    completedCount,
    completedThisWeek,
    overdueCount,
    donePercent,
  };
}

export async function getReviewQueue(): Promise<BoardTask[]> {
  const profile = await requireLead();
  const supabase = await createClient();

  const [{ data, error }, unreadTaskIds] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, category, priority, deadline, hidden, pinned, brand:brands(name), assignee:profiles!tasks_assignee_id_fkey(id, name, role)",
      )
      .eq("status", "Under Review")
      .eq("reviewer_id", profile.id)
      .order("updated_at", { ascending: false }),
    fetchUnreadTaskIds(supabase, profile.id),
  ]);

  if (error) {
    console.error("getReviewQueue:", error.message);
    return [];
  }

  const tasks: BoardTask[] = [];
  for (const row of data ?? []) {
    const task = mapBoardTask(row);
    if (!task) continue;
    tasks.push({
      ...task,
      hasUnreadResponse: unreadTaskIds.has(task.id),
    });
  }
  return tasks;
}

async function assertReviewer(
  taskId: string,
): Promise<
  | { error: string }
  | {
      profile: Awaited<ReturnType<typeof requireProfile>>;
      supabase: Awaited<ReturnType<typeof createClient>>;
      task: {
        id: string;
        title: string;
        assignee_id: string;
        reviewer_id: string | null;
        status: string;
      };
      pendingSubmissionId: string;
    }
> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, assignee_id, reviewer_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found." as const };
  }
  if (task.status !== "Under Review") {
    return { error: "This task is not under review." as const };
  }
  if (task.reviewer_id !== profile.id) {
    return { error: "You are not the assigned reviewer for this task." as const };
  }

  const pendingSubmissionId = await getPendingSubmissionId(supabase, taskId);
  if (!pendingSubmissionId) {
    return { error: "No pending submission found for this task." as const };
  }

  return { profile, supabase, task, pendingSubmissionId };
}

export async function approveTask(taskId: string) {
  const ctx = await assertReviewer(taskId);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { profile, supabase, task, pendingSubmissionId } = ctx;
  const now = new Date().toISOString();

  const { error: submissionError } = await supabase
    .from("task_submissions")
    .update({
      review_status: "approved",
      reviewed_by: profile.id,
      reviewed_at: now,
    })
    .eq("id", pendingSubmissionId);

  if (submissionError) {
    return { error: submissionError.message };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "Done",
      completed_at: now,
      reviewer_id: null,
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  await notifyUser(
    task.assignee_id,
    taskId,
    `Your task "${task.title}" was approved`,
  );

  await supabase.from("activity_log").insert({
    task_id: taskId,
    user_id: profile.id,
    action_type: "approved",
    description: `Approved "${task.title}"`,
  });

  revalidateTaskPaths();
  return { success: true };
}

export async function requestTaskChanges(taskId: string, comment: string) {
  const text = comment.trim();
  if (!text) {
    return { error: "Please describe what needs to change." };
  }

  const ctx = await assertReviewer(taskId);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { profile, supabase, task, pendingSubmissionId } = ctx;
  const now = new Date().toISOString();

  const { error: submissionError } = await supabase
    .from("task_submissions")
    .update({
      review_status: "changes",
      review_comment: text,
      reviewed_by: profile.id,
      reviewed_at: now,
    })
    .eq("id", pendingSubmissionId);

  if (submissionError) {
    return { error: submissionError.message };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "In Progress",
      reviewer_id: null,
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  await notifyUser(
    task.assignee_id,
    taskId,
    `Changes requested on "${task.title}": ${text}`,
  );

  await supabase.from("activity_log").insert({
    task_id: taskId,
    user_id: profile.id,
    action_type: "changes_requested",
    description: `Requested changes on "${task.title}"`,
  });

  revalidateTaskPaths();
  return { success: true };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const profile = await requireProfile();
  const { getUnreadNotificationCountForProfile } = await import(
    "@/app/actions/notifications"
  );
  return getUnreadNotificationCountForProfile(profile);
}

export async function addTaskComment(taskId: string, body: string) {
  const profile = await requireProfile();
  const text = body.trim();
  if (!text) {
    return { error: "Comment cannot be empty." };
  }

  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, assignee_id, reviewer_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found." };
  }

  const { data: inserted, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: profile.id,
      body: text,
    })
    .select(
      `
      id, body, created_at,
      author:profiles(id, name, role)
    `,
    )
    .single();

  if (error) {
    return { error: error.message };
  }

  const mapped = mapComment(inserted);
  if (!mapped) {
    return { error: "Comment saved but could not be loaded." };
  }

  if (task.assignee_id !== profile.id) {
    await notifyUser(
      task.assignee_id,
      taskId,
      `${profile.name} commented on "${task.title}"`,
    );
  } else if (
    task.status === "Under Review" &&
    task.reviewer_id &&
    task.reviewer_id !== profile.id
  ) {
    await notifyUser(
      task.reviewer_id,
      taskId,
      `${profile.name} commented on "${task.title}" under review`,
    );
  }

  revalidateTaskPaths();
  return { success: true, comment: mapped };
}

export async function addTaskVoiceComment(taskId: string, formData: FormData) {
  const profile = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  const voice = formData.get("voice");

  if (!(voice instanceof File) || voice.size === 0) {
    return { error: "No voice recording found." };
  }

  if (voice.size > MAX_ATTACHMENT_BYTES) {
    return { error: "Voice note is over 5MB. Record a shorter message." };
  }

  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, assignee_id, reviewer_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found." };
  }

  const extension = voice.type.includes("mp4") ? "m4a" : "webm";
  const contentType = voice.type.startsWith("audio/")
    ? voice.type
    : "audio/webm";
  const path = `${taskId}/comments/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await voice.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: inserted, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: profile.id,
      body: body || "",
      kind: "voice",
      voice_path: path,
      voice_mime_type: contentType,
      voice_size_bytes: voice.size,
    })
    .select(
      `
      id, body, kind, voice_path, voice_mime_type, voice_size_bytes, created_at,
      author:profiles(id, name, role)
    `,
    )
    .single();

  if (error) {
    await supabase.storage.from(TASK_ATTACHMENTS_BUCKET).remove([path]);
    return { error: error.message };
  }

  const { data: playback } = await supabase.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 3600);

  const mapped = mapComment(inserted, playback?.signedUrl ?? null);
  if (!mapped) {
    return { error: "Voice note saved but could not be loaded." };
  }

  if (task.assignee_id !== profile.id) {
    await notifyUser(
      task.assignee_id,
      taskId,
      `${profile.name} sent a voice note on "${task.title}"`,
    );
  } else if (
    task.status === "Under Review" &&
    task.reviewer_id &&
    task.reviewer_id !== profile.id
  ) {
    await notifyUser(
      task.reviewer_id,
      taskId,
      `${profile.name} sent a voice note on "${task.title}" under review`,
    );
  }

  revalidateTaskPaths();
  return { success: true, comment: mapped };
}

export async function markTaskNotificationsRead(taskId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", profile.id)
    .eq("task_id", taskId)
    .eq("read", false);

  revalidateTaskPaths();
  return { success: true };
}
