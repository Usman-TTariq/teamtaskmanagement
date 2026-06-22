"use client";

import { AlertTriangle, ArrowUpRight, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useTaskModal } from "@/components/tasks/task-modal-context";
import { ROLE_META, STATUS_META } from "@/lib/constants";
import type { TeamMemberWorkload } from "@/lib/types";

type Props = {
  members: TeamMemberWorkload[];
};

export function TeamView({ members }: Props) {
  const { openCreateTask } = useTaskModal();

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {members.map(({ profile, openCount, lateCount, currentTask }) => {
        const roleMeta = ROLE_META[profile.role];

        return (
          <article
            key={profile.id}
            className="flex flex-col rounded-2xl border border-[#E4E6EF] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,40,.04)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={profile.name} role={profile.role} size={44} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-extrabold text-[#14141A]">
                    {profile.name}
                  </h3>
                  <span
                    className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                    style={{
                      color: roleMeta.color,
                      background: `${roleMeta.color}18`,
                    }}
                  >
                    {profile.role}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold text-[#14141A]">
                  {openCount} open
                </p>
                {lateCount > 0 && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[#E11D2A]">
                    <AlertTriangle size={12} />
                    {lateCount} late
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4 flex-1">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9495A3]">
                Engaged with
              </p>
              {currentTask ? (
                <div className="rounded-xl border border-[#D6E4FF] bg-[#EEF4FF] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#14141A]">
                        {currentTask.title}
                      </p>
                      {currentTask.brandName && (
                        <p className="mt-1 truncate text-xs font-semibold text-[#2563EB]">
                          {currentTask.brandName}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[#2563EB]"
                    />
                  </div>
                  <span
                    className="mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white"
                    style={{
                      background:
                        STATUS_META[currentTask.status]?.grad ??
                        STATUS_META["Not Started"].grad,
                    }}
                  >
                    {currentTask.status}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8DBE8] bg-[#FAFBFD] px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-[#9495A3]">
                    Free, nothing in progress
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => openCreateTask(profile.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4E6EF] bg-white py-2.5 text-sm font-bold text-[#14141A] transition hover:border-[#D8DBE8] hover:bg-[#F7F8FD]"
            >
              <Plus size={16} />
              Assign task
            </button>
          </article>
        );
      })}
    </div>
  );
}
