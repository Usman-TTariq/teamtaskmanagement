"use client";

import { Inbox } from "lucide-react";
import { BoardTaskCard } from "@/components/board/board-task-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { BoardTask } from "@/lib/types";

type Props = {
  tasks: BoardTask[];
};

export function ReviewQueue({ tasks }: Props) {
  return (
    <section className="border border-[#E4E6EF] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#E4E6EF] px-5 py-4">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#14141A]">
            Pending review
          </h3>
          <p className="mt-1 text-[11px] font-medium text-[#9495A3]">
            Normal tasks go to Team Lead · Confidential tasks go to Manager
          </p>
        </div>
        <span className="border border-[#E4E6EF] bg-[#FAFBFD] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#14141A]">
          {tasks.length} waiting
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Inbox}
            title="No tasks waiting for your review"
            description="When someone submits work for review, it will appear here."
          />
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <BoardTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}
