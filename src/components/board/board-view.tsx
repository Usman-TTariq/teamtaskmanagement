"use client";

import { BoardTaskCard } from "@/components/board/board-task-card";
import { STATUSES, STATUS_META } from "@/lib/constants";
import type { BoardTask } from "@/lib/types";

type Props = {
  tasks: BoardTask[];
};

export function BoardView({ tasks }: Props) {
  const byStatus = Object.fromEntries(
    STATUSES.map((status) => [status, tasks.filter((t) => t.status === status)]),
  ) as Record<(typeof STATUSES)[number], BoardTask[]>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="board-scroll -mx-1 flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-1 pb-1">
        <div className="grid h-full w-max min-w-full auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3">
          {STATUSES.map((status) => {
            const meta = STATUS_META[status];
            const columnTasks = byStatus[status] ?? [];

            return (
              <section
                key={status}
                className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E4E6EF] bg-[#F4F5FA]/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]"
              >
                <header className="mb-3 flex shrink-0 items-center gap-2 px-0.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shadow-sm"
                    style={{ background: meta.grad }}
                  />
                  <h3 className="text-[13px] font-extrabold text-[#14141A]">
                    {status}
                  </h3>
                  <span
                    className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-[11px] font-extrabold text-white shadow-sm"
                    style={{ background: meta.color }}
                  >
                    {columnTasks.length}
                  </span>
                </header>

                <div className="board-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
                  {columnTasks.map((task) => (
                    <BoardTaskCard key={task.id} task={task} />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#D8DBE8]/80 bg-white/40 px-3 py-10">
                      <p className="text-center text-[11px] font-semibold leading-relaxed text-[#9495A3]">
                        No tasks here yet
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
