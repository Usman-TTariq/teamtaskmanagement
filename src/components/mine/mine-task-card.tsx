"use client";

import { Clock, Lock, MessageCircle } from "lucide-react";
import { useTaskDetailOptional } from "@/components/tasks/task-detail-context";
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

export function MineTaskCard({ task }: Props) {
  const taskDetail = useTaskDetailOptional();
  const statusMeta = STATUS_META[task.status];
  const deadline = formatDeadlineLabel(task.deadline, task.status);

  return (
    <button
      type="button"
      onClick={() => taskDetail?.openTaskDetail(task.id)}
      className="group w-full border border-[#E4E6EF] bg-white text-left transition hover:border-[#14141A]/20 hover:bg-[#FAFBFD]"
    >
      <div className="flex min-h-[108px]">
        <div
          className="w-1 shrink-0"
          style={{ background: statusMeta.color }}
        />
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-1.5">
              <h4 className="text-[13px] font-extrabold leading-snug text-[#14141A]">
                {task.title}
              </h4>
              {task.hidden && (
                <Lock
                  size={13}
                  className="mt-0.5 shrink-0 text-[#7C3AED]"
                  strokeWidth={2.4}
                />
              )}
            </div>
            {deadline && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${TONE_CLASS[deadline.tone]}`}
              >
                <Clock size={10} strokeWidth={2.4} />
                {deadline.label}
              </span>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            {task.hasUnreadResponse && (
              <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                <MessageCircle size={10} strokeWidth={2.4} />
                New response
              </span>
            )}
            {task.brandName && (
              <span className="border border-[#E4E6EF] bg-[#FAFBFD] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
                {task.brandName}
              </span>
            )}
            <span className="border border-[#E4E6EF] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6B6C7A]">
              {task.category}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
