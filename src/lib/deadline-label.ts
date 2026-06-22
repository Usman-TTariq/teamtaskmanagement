import type { TaskStatus } from "@/lib/constants";

export type DeadlineTone = "normal" | "soon" | "today" | "overdue";

export type DeadlineLabel = {
  label: string;
  tone: DeadlineTone;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDeadlineLabel(
  deadline: string | null,
  status: TaskStatus,
  options?: { compact?: boolean },
): DeadlineLabel | null {
  if (!deadline || status === "Done") return null;

  const compact = options?.compact ?? false;

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(`${deadline}T00:00:00`));
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      label: compact ? `Overdue ${days}d` : `Overdue: ${days}d`,
      tone: "overdue",
    };
  }
  if (diffDays === 0) {
    return { label: "Due today", tone: "today" };
  }
  if (diffDays === 1) {
    return { label: "Due tomorrow", tone: "soon" };
  }
  return { label: `Due in ${diffDays}d`, tone: "normal" };
}
