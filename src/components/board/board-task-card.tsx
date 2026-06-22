"use client";

import { Clock, Lock, MessageCircle } from "lucide-react";
import { useTaskDetailOptional } from "@/components/tasks/task-detail-context";
import { Avatar } from "@/components/ui/avatar";
import { formatDeadlineLabel } from "@/lib/deadline-label";
import { STATUS_META } from "@/lib/constants";
import type { BoardTask } from "@/lib/types";

const TONE_CLASS = {
  normal: "text-[#9495A3]",
  soon: "text-[#D97706]",
  today: "text-[#D97706]",
  overdue: "text-[#E11D2A]",
} as const;

type Props = {
  task: BoardTask;
};

export function BoardTaskCard({ task }: Props) {
  const taskDetail = useTaskDetailOptional();
  const statusMeta = STATUS_META[task.status];
  const deadline = formatDeadlineLabel(task.deadline, task.status);

  return (
    <button
      type="button"
      onClick={() => taskDetail?.openTaskDetail(task.id)}
      className="group w-full overflow-hidden rounded-xl border border-[#E4E6EF] bg-white text-left shadow-[0_1px_2px_rgba(20,20,40,.04)] transition hover:-translate-y-0.5 hover:border-[#D8DBE8] hover:shadow-[0_8px_20px_rgba(20,20,40,.08)]"
    >
      <div className="flex min-h-[112px]">
        <div
          className="w-[3px] shrink-0"
          style={{ background: statusMeta.grad }}
        />
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          <div className="mb-2 flex items-start gap-1.5">
            <h4 className="min-w-0 flex-1 text-[13px] font-extrabold leading-snug text-[#14141A]">
              {task.title}
            </h4>
            {task.hidden && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-[#F5F3FF] p-1 text-[#7C3AED]">
                <Lock size={12} strokeWidth={2.4} />
              </span>
            )}
          </div>

          {deadline && (
            <div className="mb-2.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${TONE_CLASS[deadline.tone]}`}
              >
                <Clock size={11} strokeWidth={2.4} />
                {deadline.label}
              </span>
            </div>
          )}

          <div className="mb-auto flex flex-wrap gap-1.5">
            {task.hasUnreadResponse && (
              <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                <MessageCircle size={10} strokeWidth={2.4} />
                New response
              </span>
            )}
            {task.brandName && (
              <span className="rounded-md bg-[#EEF1F6] px-2 py-0.5 text-[10px] font-bold text-[#64748B]">
                {task.brandName}
              </span>
            )}
            <span className="rounded-md bg-[#F4F5FA] px-2 py-0.5 text-[10px] font-bold text-[#6B6C7A]">
              {task.category}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-[#F0F1F6] pt-2.5">
            <Avatar
              name={task.assignee.name}
              role={task.assignee.role}
              size={26}
            />
            <span className="truncate text-xs font-semibold text-[#6B6C7A]">
              {task.assignee.name}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
