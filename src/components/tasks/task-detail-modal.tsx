"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Paperclip,
  Pin,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  addTaskComment,
  addTaskVoiceComment,
  approveTask,
  getTaskDetail,
  markTaskNotificationsRead,
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
import { formatAttachmentSize, MAX_ATTACHMENT_BYTES } from "@/lib/task-attachments";
import type { Profile, TaskComment, TaskDetail } from "@/lib/types";

type Props = {
  taskId: string;
  profile: Profile;
  onClose: () => void;
};

export function TaskDetailModal({ taskId, profile, onClose }: Props) {
  const router = useRouter();
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [changeComment, setChangeComment] = useState("");
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);

  const isLead = canAssign(profile);
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

  async function fetchTask(silent = false) {
    if (!silent) setLoading(true);
    const result = await getTaskDetail(taskId);
    if (result.error || !result.task) {
      if (!silent) {
        setError(result.error ?? "Could not load task.");
        setTask(null);
      }
    } else {
      setTask(result.task);
      setError("");
    }
    if (!silent) setLoading(false);
    return result.task ?? null;
  }

  useEffect(() => {
    void (async () => {
      await fetchTask(false);
      await markTaskNotificationsRead(taskId);
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
      router.refresh();
    })();
  }, [taskId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!pendingVoice) {
      setPendingVoiceUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingVoice);
    setPendingVoiceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingVoice]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function refreshAfterAction(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError("");
      await fetchTask(true);
      router.refresh();
    });
  }

  function showToast(message: string, variant: "success" | "error") {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, variant } }),
    );
  }

  function handleStatusChange(status: TaskStatus) {
    if (!task || status === task.status) return;
    const previous = task.status;
    // Show the new status instantly; sync with the server in the background.
    setTask((current) => (current ? { ...current, status } : current));
    setError("");
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, status);
      if (result.error) {
        setTask((current) =>
          current ? { ...current, status: previous } : current,
        );
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      showToast(`Moved to ${status}`, "success");
      await fetchTask(true);
      router.refresh();
    });
  }

  function handleTogglePin() {
    if (!task) return;
    const previous = task.pinned;
    setTask((current) =>
      current ? { ...current, pinned: !previous } : current,
    );
    startTransition(async () => {
      const result = await toggleTaskPinned(taskId);
      if (result.error) {
        setTask((current) =>
          current ? { ...current, pinned: previous } : current,
        );
        showToast(result.error, "error");
        return;
      }
      await fetchTask(true);
      router.refresh();
    });
  }

  function handleSubmitForReview() {
    if (!task || submitting) return;
    setSubmitting(true);
    setError("");
    startTransition(async () => {
      const result = await submitTaskForReview(taskId);
      if (result.error) {
        setSubmitting(false);
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      // Reflect the new status immediately; full refetch happens in background.
      setTask((current) =>
        current ? { ...current, status: "Under Review" } : current,
      );
      setSubmitting(false);
      showToast(`"${task.title}" submitted for review`, "success");
      await fetchTask(true);
      router.refresh();
    });
  }

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = comment.trim();
    if ((!text && !pendingVoice) || !task) return;

    startTransition(async () => {
      let result: { error?: string; comment?: TaskComment };

      if (pendingVoice) {
        const formData = new FormData();
        formData.set("voice", pendingVoice);
        if (text) formData.set("body", text);
        result = await addTaskVoiceComment(taskId, formData);
      } else {
        result = await addTaskComment(taskId, text);
      }

      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.comment) {
        setTask({
          ...task,
          comments: [...task.comments, result.comment as TaskComment],
        });
        setComment("");
        setPendingVoice(null);
        setError("");
        requestAnimationFrame(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }
    });
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      voiceChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (!blob.size) return;

        if (blob.size > MAX_ATTACHMENT_BYTES) {
          setError("Voice note is over 5MB. Record a shorter message.");
          return;
        }

        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File(
          [blob],
          `voice-comment-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${extension}`,
          { type: blob.type || "audio/webm" },
        );
        setPendingVoice(file);
      };

      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setError("Microphone access is blocked. Allow mic permission and try again.");
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  function clearPendingVoice() {
    setPendingVoice(null);
  }

  const stepIndex = task
    ? WORKFLOW_STATUSES.indexOf(
        task.status === "Blocked" ? "In Progress" : task.status,
      )
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm font-semibold text-[#6B6C7A]">
            Loading task…
          </div>
        ) : !task ? (
          <div className="px-6 py-20 text-center">
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
            {/* Header */}
            <div className="shrink-0 border-b border-[#E4E6EF] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#14141A]">
                      {task.title}
                    </h2>
                    {task.hidden && (
                      <Lock size={14} className="text-[#7C3AED]" strokeWidth={2.4} />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white"
                      style={{ background: STATUS_META[task.status].grad }}
                    >
                      {task.status}
                    </span>
                    {task.brandName && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
                        {task.brandName}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-[#9495A3]">·</span>
                    <span className="text-[10px] font-bold text-[#6B6C7A]">
                      {task.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B6C7A]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: PRIORITY_META[task.priority].dot }}
                      />
                      {task.priority}
                    </span>
                    {formatDeadlineHeader(task.deadline, task.status) && (
                      <>
                        <span className="text-[10px] font-bold text-[#9495A3]">·</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B6C7A]">
                          <Calendar size={11} />
                          {formatDeadlineHeader(task.deadline, task.status)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-1.5 text-[#9495A3] transition hover:bg-[#F4F5FA]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Compact stepper */}
              <div className="mt-3 flex items-center gap-1">
                {WORKFLOW_STATUSES.map((step, index) => {
                  const active = index === stepIndex;
                  const done = index < stepIndex;
                  return (
                    <div key={step} className="flex min-w-0 flex-1 items-center">
                      <div
                        className={`h-1 flex-1 rounded-full ${done || active ? "bg-[#E11D2A]" : "bg-[#E4E6EF]"}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wide text-[#9495A3]">
                {WORKFLOW_STATUSES.map((step, index) => (
                  <span
                    key={step}
                    className={index === stepIndex ? "text-[#E11D2A]" : undefined}
                  >
                    {step.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* Review banner */}
            {isReviewer && (
              <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">
                      Awaiting your review
                      {task.hidden && (
                        <span className="ml-2 rounded bg-[#14141A] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                          Confidential
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-amber-800/80">
                      Submitted by {task.assignee.name}
                    </p>
                  </div>
                  {!showChangeForm && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => refreshAfterAction(() => approveTask(taskId))}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setShowChangeForm(true)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-60"
                      >
                        Request changes
                      </button>
                    </div>
                  )}
                </div>
                {showChangeForm && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={changeComment}
                      onChange={(e) => setChangeComment(e.target.value)}
                      placeholder="What needs to change?"
                      rows={2}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-2">
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
                        className="rounded-lg bg-[#14141A] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
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
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {task.status === "Under Review" && isAssignee && !isReviewer && (
              <div className="shrink-0 border-b border-[#E4E6EF] bg-[#FAFBFD] px-5 py-2.5 text-xs font-semibold text-[#6B6C7A]">
                Waiting on {task.reviewer?.name ?? "reviewer"} for approval
              </div>
            )}

            {/* Toolbar */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#E4E6EF] px-5 py-3">
              <Avatar name={task.assignee.name} role={task.assignee.role} size={32} />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-[#14141A]">
                  {task.assignee.name}
                </p>
                <p
                  className="text-[10px] font-bold"
                  style={{ color: ROLE_META[task.assignee.role].color }}
                >
                  {task.assignee.role}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={task.status}
                  disabled={pending || isReviewer || (!isAssignee && !isLead)}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as TaskStatus)
                  }
                  className="rounded-lg border border-[#E4E6EF] bg-white px-2.5 py-1.5 text-xs font-bold text-[#14141A] outline-none disabled:opacity-60"
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
                  onClick={handleTogglePin}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                    task.pinned
                      ? "border-[#E11D2A] bg-[#FDE7EA] text-[#E11D2A]"
                      : "border-[#E4E6EF] bg-white text-[#14141A]"
                  }`}
                >
                  <Pin size={13} />
                  Pin
                </button>
                {isAssignee &&
                  task.status !== "Under Review" &&
                  task.status !== "Done" && (
                    <button
                      type="button"
                      disabled={pending || submitting}
                      onClick={handleSubmitForReview}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#14141A] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          Submit
                          <ChevronRight size={13} />
                        </>
                      )}
                    </button>
                  )}
              </div>
            </div>

            {/* Body — two columns */}
            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_1.1fr]">
              <div className="min-h-0 overflow-y-auto border-b border-[#E4E6EF] px-5 py-4 lg:border-b-0 lg:border-r">
                {task.description ? (
                  <div>
                    <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9495A3]">
                      Brief
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#6B6C7A]">
                      {task.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[#9495A3]">No brief provided.</p>
                )}
                {task.attachments.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9495A3]">
                      Attachments
                    </h3>
                    <ul className="space-y-2">
                      {task.attachments.map((item) => (
                        <li
                          key={item.id}
                          className={`rounded-xl border border-[#E4E6EF] bg-[#FAFBFD] px-3 py-2.5 ${
                            item.kind === "voice" ? "space-y-2" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {item.kind === "voice" ? (
                                <Mic size={14} className="shrink-0 text-[#E11D2A]" />
                              ) : (
                                <Paperclip
                                  size={14}
                                  className="shrink-0 text-[#6B6C7A]"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#14141A]">
                                  {item.kind === "voice"
                                    ? "Voice brief"
                                    : item.file_name}
                                </p>
                                <p className="text-[11px] text-[#9495A3]">
                                  {formatAttachmentSize(item.size_bytes)}
                                </p>
                              </div>
                            </div>
                            {item.kind === "file" && (item.downloadUrl || item.url) && (
                              <a
                                href={item.downloadUrl ?? item.url ?? "#"}
                                download={item.file_name}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E6EF] bg-white px-3 py-1.5 text-xs font-bold text-[#14141A] hover:bg-[#F4F5FA]"
                              >
                                <Download size={13} />
                                Download
                              </a>
                            )}
                          </div>
                          {item.kind === "voice" && item.url ? (
                            <audio
                              controls
                              controlsList="nodownload"
                              preload="metadata"
                              className="h-10 w-full"
                            >
                              <source src={item.url} type={item.mime_type} />
                              <source src={item.url} type="audio/webm" />
                              Your browser does not support audio playback.
                            </audio>
                          ) : item.kind === "voice" ? (
                            <span className="text-[11px] font-semibold text-[#9495A3]">
                              Playback unavailable
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {task.submissionCount > 0 && (
                  <p className="mt-4 text-xs font-semibold text-[#9495A3]">
                    {task.submissionCount} submission
                    {task.submissionCount === 1 ? "" : "s"} on file
                  </p>
                )}
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="flex items-center gap-2 border-b border-[#E4E6EF] px-5 py-2.5">
                  <MessageSquare size={14} className="text-[#E11D2A]" />
                  <h3 className="text-xs font-extrabold text-[#14141A]">
                    Comments
                  </h3>
                  <span className="text-xs font-bold text-[#9495A3]">
                    ({task.comments.length})
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                  {task.comments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#9495A3]">
                      No comments yet. Start the conversation below.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {task.comments.map((item) => (
                        <CommentBubble key={item.id} item={item} />
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleCommentSubmit}
                  className="shrink-0 border-t border-[#E4E6EF] bg-[#FAFBFD] px-4 py-3"
                >
                  {pendingVoice && pendingVoiceUrl && (
                    <div className="mb-2 rounded-xl border border-[#E4E6EF] bg-white px-3 py-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Mic size={14} className="text-[#E11D2A]" />
                          <span className="text-xs font-semibold text-[#14141A]">
                            Voice note
                          </span>
                          <span className="text-[11px] text-[#9495A3]">
                            {formatAttachmentSize(pendingVoice.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={clearPendingVoice}
                          className="grid h-7 w-7 place-items-center rounded-lg text-[#9495A3] hover:bg-[#FDE7EA] hover:text-[#E11D2A]"
                          aria-label="Remove voice note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <audio
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                        className="h-9 w-full"
                      >
                        <source
                          src={pendingVoiceUrl}
                          type={pendingVoice.type || "audio/webm"}
                        />
                      </audio>
                    </div>
                  )}
                  {recording && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-[#E11D2A] bg-[#FFF5F6] px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#E11D2A]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#E11D2A]" />
                        Recording… {recordSeconds}s
                      </span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E11D2A] px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        <Square size={11} fill="currentColor" />
                        Stop
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a comment…"
                      className="min-w-0 flex-1 rounded-xl border border-[#E4E6EF] bg-white px-3 py-2 text-sm outline-none focus:border-[#E11D2A]"
                    />
                    {recording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E11D2A] bg-[#FFF5F6] text-[#E11D2A]"
                        aria-label="Stop recording"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={pending}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E4E6EF] bg-white text-[#6B6C7A] transition hover:border-[#E11D2A] hover:bg-[#FFF5F6] hover:text-[#E11D2A] disabled:opacity-60"
                        aria-label="Record voice note"
                      >
                        <Mic size={15} />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={pending || (!comment.trim() && !pendingVoice)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] text-white disabled:opacity-60"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  {error && (
                    <p className="mt-2 text-xs font-medium text-[#E11D2A]">
                      {error}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CommentBubble({ item }: { item: TaskComment }) {
  const isLead = canAssign(item.author.role);
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        isLead
          ? "border border-amber-100 bg-amber-50/60"
          : "border border-[#EEF1F6] bg-white"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-extrabold text-[#14141A]">
          {item.author.name}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-extrabold"
          style={{
            color: ROLE_META[item.author.role].color,
            background: `${ROLE_META[item.author.role].color}18`,
          }}
        >
          {item.author.role}
        </span>
        <span className="ml-auto text-[10px] text-[#9495A3]">
          {formatCommentTime(item.created_at)}
        </span>
      </div>
      {item.body ? (
        <p className="text-sm leading-relaxed text-[#6B6C7A]">{item.body}</p>
      ) : null}
      {item.kind === "voice" && item.voiceUrl && (
        <div className="mt-2 space-y-1">
          {!item.body && (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9495A3]">
              <Mic size={12} className="text-[#E11D2A]" />
              Voice note
            </p>
          )}
          <audio
            controls
            controlsList="nodownload"
            preload="metadata"
            className="h-9 w-full"
          >
            <source src={item.voiceUrl} type={item.voiceMimeType ?? "audio/webm"} />
          </audio>
        </div>
      )}
    </div>
  );
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
