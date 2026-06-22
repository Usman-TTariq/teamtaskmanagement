import type { TaskStatus } from "@/lib/constants";
import { formatDeadlineLabel } from "@/lib/deadline-label";

export function formatDeadlineHeader(
  deadline: string | null,
  status: TaskStatus,
): string | null {
  if (!deadline) return null;

  const date = new Date(`${deadline}T00:00:00`);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const relative = formatDeadlineLabel(deadline, status);

  return relative ? `${dateStr} · ${relative.label}` : dateStr;
}
