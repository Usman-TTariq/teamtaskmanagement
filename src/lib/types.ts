import type { TaskCategory, TaskPriority, TaskStatus, UserRole } from "@/lib/constants";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  can_assign_tasks: boolean;
};

export type Brand = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  brand_id: string | null;
  category: TaskCategory;
  assignee_id: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  estimated_hours: number | null;
  started_at: string | null;
  completed_at: string | null;
  hidden: boolean;
  visible_to: string[] | null;
  pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AllowedEmail = {
  email: string;
  name: string;
  role: UserRole;
  can_assign_tasks: boolean;
};

export type TeamMemberWorkload = {
  profile: Profile;
  openCount: number;
  lateCount: number;
  currentTask: {
    id: string;
    title: string;
    brandName: string | null;
    status: TaskStatus;
  } | null;
};

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  deadline: string | null;
  hidden: boolean;
  pinned: boolean;
  brandName: string | null;
  assignee: {
    id: string;
    name: string;
    role: UserRole;
  };
  hasUnreadResponse?: boolean;
};

export type AllTask = BoardTask & {
  created_at: string;
  brand_id: string | null;
};

export type TaskComment = {
  id: string;
  body: string;
  kind: "text" | "voice";
  created_at: string;
  voiceUrl: string | null;
  voiceMimeType: string | null;
  author: {
    id: string;
    name: string;
    role: UserRole;
  };
};

export type TaskAttachment = {
  id: string;
  file_name: string;
  kind: "file" | "voice";
  mime_type: string;
  size_bytes: number;
  url: string | null;
  downloadUrl: string | null;
};

export type TaskDetail = BoardTask & {
  description: string;
  assignee_id: string;
  created_by: string;
  created_at: string;
  reviewer_id: string | null;
  reviewer: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  pendingSubmissionId: string | null;
  comments: TaskComment[];
  submissionCount: number;
  attachments: TaskAttachment[];
};

export type DashboardStats = {
  totalTasks: number;
  addedThisWeek: number;
  completedCount: number;
  completedThisWeek: number;
  overdueCount: number;
  donePercent: number;
};

export type AppNotification = {
  id: string;
  message: string;
  task_id: string | null;
  read: boolean;
  created_at: string;
};
