"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Inbox, ListChecks, Sparkles } from "lucide-react";
import { updateTaskStatus } from "@/app/actions/tasks";
import { MineTaskCard } from "@/components/mine/mine-task-card";
import { StatCard } from "@/components/ui/stat-card";
import {
  MEMBER_STATUSES,
  MINE_PIPELINE_STATUSES,
  STATUSES,
  STATUS_META,
  type TaskStatus,
} from "@/lib/constants";
import { canAssign } from "@/lib/permissions";
import type { BoardTask, Profile } from "@/lib/types";

type StatFilter = "open" | "in-progress" | "under-review" | "completed";

type Props = {
  profile: Profile;
  tasks: BoardTask[];
};

const FILTER_COLUMNS: Record<StatFilter, TaskStatus[]> = {
  open: ["Not Started", "In Progress", "Blocked", "Under Review"],
  "in-progress": ["In Progress"],
  "under-review": ["Under Review"],
  completed: ["Done"],
};

const FILTER_LABELS: Record<StatFilter, string> = {
  open: "Open tasks",
  "in-progress": "In progress",
  "under-review": "Under review",
  completed: "Completed",
};

export function MyTasksView({ profile, tasks: serverTasks }: Props) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<StatFilter | null>(null);
  const pipelineRef = useRef<HTMLElement>(null);
  const [dragTask, setDragTask] = useState<{
    id: string;
    status: TaskStatus;
  } | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, TaskStatus>
  >({});

  const allowedDropStatuses = canAssign(profile)
    ? [...STATUSES]
    : MEMBER_STATUSES;

  // Drop optimistic overrides once the server data catches up.
  useEffect(() => {
    setStatusOverrides((current) => {
      const next = { ...current };
      let changed = false;
      for (const task of serverTasks) {
        if (next[task.id] && next[task.id] === task.status) {
          delete next[task.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [serverTasks]);

  const tasks = useMemo(
    () =>
      serverTasks.map((task) =>
        statusOverrides[task.id] && statusOverrides[task.id] !== task.status
          ? { ...task, status: statusOverrides[task.id] }
          : task,
      ),
    [serverTasks, statusOverrides],
  );

  function showToast(message: string, variant: "success" | "error") {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, variant } }),
    );
  }

  function handleDrop(status: TaskStatus) {
    const dragged = dragTask;
    setDragTask(null);
    setDragOverStatus(null);
    if (!dragged || dragged.status === status) return;

    if (!allowedDropStatuses.includes(status)) {
      showToast(
        "You can only move tasks to Not Started, In Progress, or Blocked. Use Submit for review.",
        "error",
      );
      return;
    }

    setStatusOverrides((current) => ({ ...current, [dragged.id]: status }));

    void (async () => {
      const result = await updateTaskStatus(dragged.id, status);
      if (result.error) {
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[dragged.id];
          return next;
        });
        showToast(result.error, "error");
        return;
      }
      showToast(`Moved to ${status}`, "success");
      router.refresh();
    })();
  }

  const openTasks = tasks.filter((task) => task.status !== "Done");
  const inProgressCount = tasks.filter(
    (task) => task.status === "In Progress",
  ).length;
  const underReviewCount = tasks.filter(
    (task) => task.status === "Under Review",
  ).length;
  const underReviewWithResponse = tasks.filter(
    (task) => task.status === "Under Review" && task.hasUnreadResponse,
  ).length;
  const completedCount = tasks.filter((task) => task.status === "Done").length;

  const byStatus = useMemo(
    () =>
      Object.fromEntries(
        MINE_PIPELINE_STATUSES.map((status) => [
          status,
          tasks.filter((task) => task.status === status),
        ]),
      ) as Record<TaskStatus, BoardTask[]>,
    [tasks],
  );

  const visibleColumns = activeFilter
    ? FILTER_COLUMNS[activeFilter]
    : MINE_PIPELINE_STATUSES;

  function toggleFilter(filter: StatFilter) {
    setActiveFilter((current) => (current === filter ? null : filter));
    requestAnimationFrame(() => {
      pipelineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  return (
    <div className="space-y-5">
      <section className="border border-[#2A2A36] bg-[#101019]">
        <div className="border-l-4 border-[#E11D2A] px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9495A3]">
                Welcome back
              </p>
              <h2 className="mt-1 text-[28px] font-extrabold leading-none tracking-tight text-white">
                {profile.name}
              </h2>
              <p className="mt-2 text-sm font-medium text-[#A9AAB8]">
                Your assigned work, grouped by status.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-white">
              <Sparkles size={14} className="text-[#FF8A9A]" />
              {openTasks.length} open
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          sharp
          selected={activeFilter === "open"}
          onClick={() => toggleFilter("open")}
          label="Open tasks"
          value={openTasks.length}
          sub="Assigned to you"
          grad="linear-gradient(135deg,#818CF8,#6366F1)"
          glow="rgba(99,102,241,.28)"
          icon={ListChecks}
        />
        <StatCard
          sharp
          selected={activeFilter === "in-progress"}
          onClick={() => toggleFilter("in-progress")}
          label="In progress"
          value={inProgressCount}
          sub="Currently active"
          grad={STATUS_META["In Progress"].grad}
          glow="rgba(37,99,235,.28)"
          icon={Clock}
        />
        <StatCard
          sharp
          selected={activeFilter === "under-review"}
          onClick={() => toggleFilter("under-review")}
          label="Under review"
          value={underReviewCount}
          sub={
            underReviewWithResponse > 0
              ? `${underReviewWithResponse} new response${underReviewWithResponse > 1 ? "s" : ""}`
              : "Waiting for approval"
          }
          grad={STATUS_META["Under Review"].grad}
          glow="rgba(217,119,6,.28)"
          icon={Inbox}
        />
        <StatCard
          sharp
          selected={activeFilter === "completed"}
          onClick={() => toggleFilter("completed")}
          label="Completed"
          value={completedCount}
          sub="All time"
          grad={STATUS_META.Done.grad}
          glow="rgba(5,150,105,.28)"
          icon={Sparkles}
        />
      </section>

      <section ref={pipelineRef} className="border border-[#E4E6EF] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E6EF] px-5 py-4">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#14141A]">
              Your pipeline
              {activeFilter && (
                <span className="ml-2 font-bold normal-case tracking-normal text-[#E11D2A]">
                  · {FILTER_LABELS[activeFilter]}
                </span>
              )}
            </h3>
            <p className="mt-1 text-[11px] font-medium text-[#9495A3]">
              {activeFilter
                ? "Click the same stat box again to show all columns."
                : "Drag cards between columns, or click a stat box to filter."}
            </p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9495A3]">
            {activeFilter
              ? visibleColumns.reduce(
                  (sum, status) => sum + (byStatus[status]?.length ?? 0),
                  0,
                )
              : openTasks.length}{" "}
            shown
          </p>
        </div>

        <div
          className="grid divide-y divide-[#E4E6EF] lg:divide-x lg:divide-y-0"
          style={{
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleColumns.map((status) => {
            const meta = STATUS_META[status];
            const columnTasks = byStatus[status] ?? [];
            const isDropTarget =
              dragTask != null &&
              dragTask.status !== status &&
              allowedDropStatuses.includes(status);
            const isDragOver = isDropTarget && dragOverStatus === status;

            return (
              <div
                key={status}
                id={`mine-column-${status.replace(/\s+/g, "-").toLowerCase()}`}
                onDragOver={(e) => {
                  if (!isDropTarget) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStatus !== status) setDragOverStatus(status);
                }}
                onDragLeave={(e) => {
                  if (
                    e.relatedTarget instanceof Node &&
                    e.currentTarget.contains(e.relatedTarget)
                  ) {
                    return;
                  }
                  if (dragOverStatus === status) setDragOverStatus(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(status);
                }}
                className={`flex min-h-[320px] flex-col transition-colors ${
                  isDragOver
                    ? "bg-white outline-dashed outline-2 -outline-offset-2"
                    : dragTask && !isDropTarget && dragTask.status !== status
                      ? "bg-[#FAFBFD] opacity-50"
                      : "bg-[#FAFBFD]"
                }`}
                style={isDragOver ? { outlineColor: meta.color } : undefined}
              >
                <div className="flex items-center gap-2 border-b border-[#E4E6EF] bg-white px-4 py-3">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ background: meta.color }}
                  />
                  <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#14141A]">
                    {status}
                  </span>
                  <span className="ml-auto min-w-[22px] border border-[#E4E6EF] bg-[#FAFBFD] px-1.5 py-0.5 text-center text-[10px] font-extrabold text-[#14141A]">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {columnTasks.map((task) => (
                    <MineTaskCard
                      key={task.id}
                      task={task}
                      draggable
                      dragging={dragTask?.id === task.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", task.id);
                        setDragTask({ id: task.id, status: task.status });
                      }}
                      onDragEnd={() => {
                        setDragTask(null);
                        setDragOverStatus(null);
                      }}
                    />
                  ))}

                  {isDragOver && (
                    <div
                      className="pointer-events-none border border-dashed px-3 py-4 text-center text-[11px] font-extrabold uppercase tracking-wide"
                      style={{ borderColor: meta.color, color: meta.color }}
                    >
                      Drop here
                    </div>
                  )}

                  {columnTasks.length === 0 && !isDragOver && (
                    <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-[#D8DBE8] bg-white px-4 py-10 text-center">
                      <ListChecks
                        size={20}
                        className="mb-2 text-[#C9CAD4]"
                        strokeWidth={2}
                      />
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[#6B6C7A]">
                        Empty
                      </p>
                      <p className="mt-1 max-w-[180px] text-[11px] leading-relaxed text-[#9495A3]">
                        No tasks in {status.toLowerCase()}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
