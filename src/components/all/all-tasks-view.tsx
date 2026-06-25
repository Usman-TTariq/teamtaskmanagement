"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Search, Trash2 } from "lucide-react";
import { deleteTask } from "@/app/actions/tasks";
import { useTaskDetailOptional } from "@/components/tasks/task-detail-context";
import { Avatar } from "@/components/ui/avatar";
import { formatDeadlineLabel } from "@/lib/deadline-label";
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
} from "@/lib/constants";
import type { AllTask, Brand, Profile } from "@/lib/types";

const TONE_CLASS = {
  normal: "text-[#9495A3]",
  soon: "text-[#D97706]",
  today: "text-[#D97706]",
  overdue: "text-[#E11D2A]",
} as const;

const selectClass =
  "rounded-xl border border-[#E4E6EF] bg-white px-3 py-2 text-sm font-semibold text-[#14141A] outline-none transition focus:border-[#E11D2A]";

type Props = {
  tasks: AllTask[];
  brands: Brand[];
  members: Profile[];
};

export function AllTasksView({ tasks, brands, members }: Props) {
  const taskDetail = useTaskDetailOptional();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [search, setSearch] = useState("");
  const [assigneeId, setAssigneeId] = useState("anyone");
  const [brandId, setBrandId] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("any");
  const [priority, setPriority] = useState("any");
  const [assignedOn, setAssignedOn] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return localTasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return false;
      if (assigneeId !== "anyone" && task.assignee.id !== assigneeId) {
        return false;
      }
      if (brandId !== "all" && task.brand_id !== brandId) return false;
      if (category !== "all" && task.category !== category) return false;
      if (status !== "any" && task.status !== status) return false;
      if (priority !== "any" && task.priority !== priority) return false;
      if (assignedOn && task.created_at.slice(0, 10) !== assignedOn) {
        return false;
      }
      return true;
    });
  }, [
    localTasks,
    search,
    assigneeId,
    brandId,
    category,
    status,
    priority,
    assignedOn,
  ]);

  function handleDelete(taskId: string, title: string) {
    const confirmed = window.confirm(
      `Delete "${title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError("");
    const previous = localTasks;
    setLocalTasks((current) => current.filter((task) => task.id !== taskId));

    void deleteTask(taskId).then((result) => {
      if (result.error) {
        setLocalTasks(previous);
        setDeleteError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9495A3]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            className="w-full rounded-xl border border-[#E4E6EF] bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#E11D2A]"
          />
        </div>

        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className={selectClass}
        >
          <option value="anyone">Anyone</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className={selectClass}
        >
          <option value="all">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          <option value="all">All types</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
        >
          <option value="any">Any status</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={selectClass}
        >
          <option value="any">Any priority</option>
          {PRIORITIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 rounded-xl border border-[#E4E6EF] bg-white px-3 py-2">
          <span className="whitespace-nowrap text-sm font-semibold text-[#6B6C7A]">
            Assigned on
          </span>
          <input
            type="date"
            value={assignedOn}
            onChange={(e) => setAssignedOn(e.target.value)}
            className="text-sm font-semibold text-[#14141A] outline-none"
          />
        </div>
      </div>

      {deleteError && (
        <p className="text-xs font-medium text-[#E11D2A]">{deleteError}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E4E6EF] bg-white shadow-[0_1px_2px_rgba(20,20,40,.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr className="border-b border-[#E4E6EF] bg-[#FAFBFD]">
                {["Task", "Brand", "Type", "Assignee", "Status", "Deadline", ""].map(
                  (label) => (
                    <th
                      key={label || "actions"}
                      className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9495A3]"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const deadline = formatDeadlineLabel(task.deadline, task.status, {
                  compact: true,
                });
                const statusMeta = STATUS_META[task.status];
                const priorityMeta = PRIORITY_META[task.priority];

                return (
                  <tr
                    key={task.id}
                    onClick={() => taskDetail?.openTaskDetail(task.id)}
                    className="cursor-pointer border-b border-[#F0F1F6] transition last:border-b-0 hover:bg-[#FAFBFD]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-[220px] items-center gap-2.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: priorityMeta.dot }}
                        />
                        <span className="text-sm font-extrabold text-[#14141A]">
                          {task.title}
                        </span>
                        {task.hidden && (
                          <Lock
                            size={13}
                            className="shrink-0 text-[#7C3AED]"
                            strokeWidth={2.4}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-[#6B6C7A]">
                      {task.brandName ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-[#6B6C7A]">
                      {task.category}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={task.assignee.name}
                          role={task.assignee.role}
                          size={28}
                        />
                        <span className="text-sm font-semibold text-[#14141A]">
                          {task.assignee.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex rounded-md px-2.5 py-1 text-[11px] font-extrabold text-white"
                        style={{ background: statusMeta.grad }}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {deadline ? (
                        <span
                          className={`text-sm font-bold ${TONE_CLASS[deadline.tone]}`}
                        >
                          {deadline.label}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-[#C9CAD4]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(task.id, task.title);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#9495A3] transition hover:bg-[#FDE7EA] hover:text-[#E11D2A]"
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 size={15} strokeWidth={2.2} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-[#6B6C7A]">
              {localTasks.length === 0
                ? "No tasks yet. Create one with + New task."
                : "No tasks match your filters."}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-[#9495A3]">
        Showing {filtered.length} of {localTasks.length} tasks
      </p>
    </div>
  );
}
