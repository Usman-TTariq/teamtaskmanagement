"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Clock,
  Flag,
  Mic,
  Paperclip,
  Pin,
  Send,
  X,
} from "lucide-react";
import {
  addTaskComment,
  approveTask,
  getTaskDetail,
  requestTaskChanges,
  submitTaskForReview,
  toggleTaskPinned,
  updateTaskStatus,
} from "@/app/actions/tasks";
import { Avatar } from "@/components/ui/avatar";
import { formatDeadlineHeader } from "@/lib/deadline-header";
import {
  MEMBER_STATUSES,
  PRIORITY_META,
  ROLE_META,
  STATUSES,
  STATUS_META,
  WORKFLOW_STATUSES,
  type TaskStatus,
} from "@/lib/constants";
import { canAssign } from "@/lib/permissions";
import type { Profile, TaskDetail } from "@/lib/types";

type Props = {
  taskId: string;
  profile: Profile;
  onClose: () => void;
};

export function TaskDetailModal({ taskId, profile, onClose }: Props) {
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [changeComment, setChangeComment] = useState("");
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const isLead = canAssign(profile.role);
  const isAssignee = task?.assignee_id === profile.id;
  const isReviewer =
    task?.status === "Under Review" && task.reviewer_id === profile.id;

  const statusOptions = useMemo(() => {
    if (isLead) return [...STATUSES];
    const options = [...MEMBER_STATUSES];
    if (task && !options.includes(task.status)) {
      options.push(task.status);
    }
    return options;
  }, [isLead, task]);

  async function loadTask() {
    setLoading(true);
    setError("");
    const result = await getTaskDetail(taskId);
    if (result.error || !result.task) {
      setError(result.error ?? "Could not load task.");
      setTask(null);
    } else {
      setTask(result.task);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTask();
  }, [taskId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function refreshAfterAction(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError("");
      await loadTask();
      router.refresh();
    });
  }

  const stepIndex = task
    ? WORKFLOW_STATUSES.indexOf(
        task.status === "Blocked" ? "In Progress" : task.status,
      )
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {loading ? (
          <div className="px-6 py-16 text-center text-sm font-semibold text-[#6B6C7A]">
            Loading task…
          </div>
        ) : !task ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-[#E11D2A]">
              {error || "Task not found."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-sm font-bold text-[#6B6C7A]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-[#E4E6EF] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-[#14141A]">
                    {task.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white"
                      style={{ background: STATUS_META[task.status].grad }}
                    >
                      {task.status}
                    </span>
                    {task.brandName && (
                      <span className="rounded-md bg-[#EEF1F6] px-2 py-0.5 text-[11px] font-bold text-[#64748B]">
                        {task.brandName}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-[#14141A]">
                      {task.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6B6C7A]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: PRIORITY_META[task.priority].dot,
                        }}
                      />
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-[#9495A3] transition hover:bg-[#F4F5FA]"
                  >
                    <X size={18} />
                  </button>
                  {formatDeadlineHeader(task.deadline, task.status) && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B6C7A]">
                      <Calendar size={13} />
                      {formatDeadlineHeader(task.deadline, task.status)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2">
                {WORKFLOW_STATUSES.map((step, index) => {
                  const active = index === stepIndex;
                  const done = index < stepIndex;
                  return (
                    <div key={step} className="flex min-w-0 flex-1 items-center">
                      <div className="flex min-w-0 flex-col items-center gap-1.5">
                        <span
                          className="grid h-4 w-4 place-items-center rounded-full border-2"
                          style={{
                            borderColor: active || done ? "#E11D2A" : "#D8DBE8",
                            background: active ? "#E11D2A" : "white",
                            boxShadow: active
                              ? "0 0 0 3px rgba(225,29,42,.15)"
                              : undefined,
                          }}
                        >
                          {done && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#E11D2A]" />
                          )}
                        </span>
                        <span
                          className={`truncate text-[10px] font-bold ${active ? "text-[#E11D2A]" : "text-[#9495A3]"}`}
                        >
                          {step}
                        </span>
                      </div>
                      {index < WORKFLOW_STATUSES.length - 1 && (
                        <div className="mx-1 mb-4 h-px flex-1 bg-[#E4E6EF]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              {isReviewer && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-amber-900">
                      Awaiting your review
                    </p>
                    {task.hidden && (
                      <span className="rounded-md bg-[#14141A] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                        Confidential
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-800/80">
                    Submitted by {task.assignee.name}. Approve to mark done or
                    request changes to send it back.
                  </p>

                  {showChangeForm ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={changeComment}
                        onChange={(e) => setChangeComment(e.target.value)}
                        placeholder="Describe what needs to change…"
                        rows={3}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending || !changeComment.trim()}
                          onClick={() =>
                            refreshAfterAction(async () => {
                              const result = await requestTaskChanges(
                                taskId,
                                changeComment,
                              );
                              if (!result.error) {
                                setChangeComment("");
                                setShowChangeForm(false);
                              }
                              return result;
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-[#14141A] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#26262F] disabled:opacity-60"
                        >
                          Send feedback
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setShowChangeForm(false);
                            setChangeComment("");
                          }}
                          className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          refreshAfterAction(() => approveTask(taskId))
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setShowChangeForm(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                      >
                        Request changes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {task.status === "Under Review" && isAssignee && !isReviewer && (
                <div className="rounded-xl border border-[#E4E6EF] bg-[#FAFBFD] px-4 py-3 text-sm font-semibold text-[#6B6C7A]">
                  Submitted for review
                  {task.reviewer
                    ? ` — waiting on ${task.reviewer.name}`
                    : ""}
                  .
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-[#E4E6EF] bg-[#FAFBFD] p-3">
                <Avatar
                  name={task.assignee.name}
                  role={task.assignee.role}
                  size={40}
                />
                <div>
                  <p className="text-sm font-extrabold text-[#14141A]">
                    {task.assignee.name}
                  </p>
                  <span
                    className="mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold"
                    style={{
                      color: ROLE_META[task.assignee.role].color,
                      background: `${ROLE_META[task.assignee.role].color}18`,
                    }}
                  >
                    {task.assignee.role}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={task.status}
                  disabled={pending || isReviewer || (!isAssignee && !isLead)}
                  onChange={(e) =>
                    refreshAfterAction(() =>
                      updateTaskStatus(taskId, e.target.value as TaskStatus),
                    )
                  }
                  className="rounded-xl border border-[#E4E6EF] bg-white px-3 py-2 text-sm font-bold text-[#14141A] outline-none disabled:opacity-60"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={pending || (!isAssignee && !isLead)}
                  onClick={() =>
                    refreshAfterAction(() => toggleTaskPinned(taskId))
                  }
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${
                    task.pinned
                      ? "border-[#E11D2A] bg-[#FDE7EA] text-[#E11D2A]"
                      : "border-[#E4E6EF] bg-white text-[#14141A]"
                  }`}
                >
                  <Pin size={15} />
                  Pin for today
                </button>

                {isAssignee &&
                  task.status !== "Under Review" &&
                  task.status !== "Done" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        refreshAfterAction(() => submitTaskForReview(taskId))
                      }
                      className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#14141A] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#26262F] disabled:opacity-60"
                    >
                      Submit for review
                      <ChevronRight size={15} />
                    </button>
                  )}
              </div>

              {task.description && (
                <Section icon={Paperclip} title="Brief">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#6B6C7A]">
                    {task.description}
                  </p>
                </Section>
              )}

              <Section
                icon={Paperclip}
                title="Brief & reference files"
                count={0}
              >
                <p className="text-sm text-[#9495A3]">None.</p>
              </Section>

              <Section icon={Clock} title="Submissions" count={task.submissionCount}>
                {task.submissionCount === 0 ? (
                  <p className="text-sm text-[#9495A3]">
                    No work submitted yet.
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-[#6B6C7A]">
                    {task.submissionCount} submission
                    {task.submissionCount === 1 ? "" : "s"} on file.
                  </p>
                )}
              </Section>

              <Section icon={Mic} title="Voice messages" count={0}>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#D8DBE8] px-3 py-2 text-sm font-semibold text-[#9495A3]"
                >
                  <Mic size={15} />
                  Record voice
                </button>
              </Section>

              <Section icon={Flag} title="Comments" count={task.comments.length}>
                {task.comments.length === 0 ? (
                  <p className="mb-3 text-sm text-[#9495A3]">No comments yet.</p>
                ) : (
                  <div className="mb-3 space-y-3">
                    {task.comments.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#EEF1F6] bg-[#FAFBFD] p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#14141A]">
                            {item.author.name}
                          </span>
                          <span className="text-[10px] text-[#9495A3]">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B6C7A]">{item.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    refreshAfterAction(async () => {
                      const result = await addTaskComment(taskId, comment);
                      if (!result.error) setComment("");
                      return result;
                    });
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment"
                    className="min-w-0 flex-1 rounded-xl border border-[#E4E6EF] px-3 py-2.5 text-sm outline-none focus:border-[#E11D2A]"
                  />
                  <button
                    type="submit"
                    disabled={pending || !comment.trim()}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] text-white disabled:opacity-60"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </Section>

              {error && (
                <p className="text-sm font-medium text-[#E11D2A]">{error}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Paperclip;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-[#E11D2A]" strokeWidth={2.3} />
        <h3 className="text-sm font-extrabold text-[#14141A]">
          {title}
          {count != null && (
            <span className="font-bold text-[#9495A3]"> ({count})</span>
          )}
        </h3>
      </div>
      {children}
    </section>
  );
}
