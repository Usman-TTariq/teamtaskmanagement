"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Lock,
  Mic,
  Paperclip,
  Pin,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { createBrand, createTaskWithAttachments } from "@/app/actions/tasks";
import {
  CATEGORIES,
  COLORS,
  PRIORITIES,
  type TaskCategory,
  type TaskPriority,
} from "@/lib/constants";
import {
  formatAttachmentSize,
  MAX_ATTACHMENT_BYTES,
  type PendingAttachment,
} from "@/lib/task-attachments";
import type { Brand, Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  brands: Brand[];
  members: Profile[];
  presetAssigneeId?: string;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[#E4E6EF] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#E11D2A]";

const labelClass = "mb-1.5 block text-xs font-bold text-[#6B6C7A]";

const ADD_BRAND_VALUE = "__add_new_brand__";

export function CreateTaskModal({
  profile,
  brands: initialBrands,
  members,
  presetAssigneeId,
  onClose,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [brandId, setBrandId] = useState(initialBrands[0]?.id ?? "");
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [category, setCategory] = useState<TaskCategory>("Development");
  const [assigneeId, setAssigneeId] = useState(
    presetAssigneeId ?? members[0]?.id ?? "",
  );
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (presetAssigneeId) {
      setAssigneeId(presetAssigneeId);
    }
  }, [presetAssigneeId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const urls = Object.fromEntries(
      attachments.map((item) => [item.id, URL.createObjectURL(item.file)]),
    );
    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const assignee = members.find((m) => m.id === assigneeId);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const next: PendingAttachment[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`"${file.name}" is over 5MB.`);
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        kind: "file",
      });
    }

    if (next.length) {
      setAttachments((current) => [...current, ...next]);
      setError("");
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function saveNewBrand() {
    const name = newBrandName.trim();
    if (!name || savingBrand) return;

    setSavingBrand(true);
    const result = await createBrand(name);
    setSavingBrand(false);

    if (result.error || !result.brand) {
      setError(result.error ?? "Could not add brand.");
      return;
    }

    const brand = result.brand;
    setBrands((current) =>
      current.some((item) => item.id === brand.id)
        ? current
        : [...current, brand].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setBrandId(brand.id);
    setAddingBrand(false);
    setNewBrandName("");
    setError("");
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
          setError("Voice recording is over 5MB. Record a shorter brief.");
          return;
        }

        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File(
          [blob],
          `voice-brief-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${extension}`,
          { type: blob.type || "audio/webm" },
        );

        setAttachments((current) => [
          ...current,
          { id: crypto.randomUUID(), file, kind: "voice" },
        ]);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!assigneeId) {
      setError("Choose who to assign this task to.");
      return;
    }
    if (!brandId) {
      setError("Choose a brand.");
      return;
    }

    const hours = estimatedHours.trim()
      ? Number.parseFloat(estimatedHours)
      : null;

    let attachmentFormData: FormData | null = null;
    if (attachments.length) {
      attachmentFormData = new FormData();
      attachments.forEach((item, index) => {
        attachmentFormData!.append("files", item.file, item.file.name);
        attachmentFormData!.append(`kind:${index}`, item.kind);
      });
    }

    const payload = {
      title: trimmedTitle,
      description,
      brandId,
      category,
      assigneeId,
      priority,
      deadline: deadline || null,
      estimatedHours: hours != null && !Number.isNaN(hours) ? hours : null,
      pinned,
      hidden,
    };

    onClose();

    void (async () => {
      const result = await createTaskWithAttachments(payload, attachmentFormData);

      if (result.error) {
        window.dispatchEvent(
          new CustomEvent("app:toast", {
            detail: {
              message: result.error,
              variant: "error",
            },
          }),
        );
        return;
      }

      router.refresh();
    })();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E4E6EF] px-6 py-4">
          <h2 className="text-lg font-extrabold text-[#14141A]">New task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9495A3] transition hover:bg-[#F4F5FA] hover:text-[#14141A]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief, links, requirements"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Brand</label>
                {addingBrand ? (
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveNewBrand();
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setAddingBrand(false);
                          setNewBrandName("");
                        }
                      }}
                      placeholder="New brand name"
                      disabled={savingBrand}
                      className={`${inputClass} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => void saveNewBrand()}
                      disabled={savingBrand || !newBrandName.trim()}
                      className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-[#14141A] text-white disabled:opacity-50"
                      aria-label="Save brand"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingBrand(false);
                        setNewBrandName("");
                      }}
                      disabled={savingBrand}
                      className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-[#E4E6EF] text-[#6B6C7A] hover:bg-[#F4F5FA]"
                      aria-label="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={brandId}
                    onChange={(e) => {
                      if (e.target.value === ADD_BRAND_VALUE) {
                        setAddingBrand(true);
                        return;
                      }
                      setBrandId(e.target.value);
                    }}
                    className={inputClass}
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                    <option value={ADD_BRAND_VALUE}>+ Add new brand…</option>
                  </select>
                )}
              </div>
              <div>
                <label className={labelClass}>Task type</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as TaskCategory)
                  }
                  className={inputClass}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Assign to</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={inputClass}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TaskPriority)
                  }
                  className={inputClass}
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Est. hours (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 4"
                  className={inputClass}
                />
              </div>
            </div>

            <ToggleRow
              icon={Pin}
              title="Pin for today"
              description="Flag this as needing delivery today. It shows in the pinned strip."
              checked={pinned}
              onChange={setPinned}
            />

            <div
              className={`rounded-xl border p-4 transition ${
                hidden
                  ? "border-[#C4B5FD] bg-[#F5F3FF]"
                  : "border-[#E4E6EF] bg-[#FAFBFD]"
              }`}
            >
              <ToggleRow
                icon={Lock}
                title="Confidential task"
                description="Only you and the assignee can see this task. It stays hidden from the rest of the team, dashboard, and board."
                checked={hidden}
                onChange={setHidden}
                accent={COLORS.violet}
              />

              {hidden && assignee && (
                <div className="mt-4 border-t border-[#DDD6FE] pt-4">
                  <p className="text-xs leading-relaxed text-[#6B6C7A]">
                    Visible only to{" "}
                    <span className="font-bold text-[#14141A]">
                      {profile.name}
                    </span>{" "}
                    and{" "}
                    <span className="font-bold text-[#14141A]">
                      {assignee.name}
                    </span>
                    . No one else on the team will see or get notified about
                    this task.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Brief attachments</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8DBE8] bg-[#FAFBFD] px-3 py-2.5 text-sm font-semibold text-[#14141A] transition hover:border-[#E11D2A] hover:bg-[#FFF5F6]"
                >
                  <Paperclip size={15} />
                  Add files
                </button>
                <p className="mt-1.5 text-[11px] text-[#9495A3]">
                  5MB per file, any type.
                </p>
              </div>
              <div>
                <label className={labelClass}>Voice brief</label>
                {recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E11D2A] bg-[#FFF5F6] px-3 py-2.5 text-sm font-semibold text-[#E11D2A]"
                  >
                    <Square size={14} fill="currentColor" />
                    Stop ({recordSeconds}s)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8DBE8] bg-[#FAFBFD] px-3 py-2.5 text-sm font-semibold text-[#14141A] transition hover:border-[#E11D2A] hover:bg-[#FFF5F6]"
                  >
                    <Mic size={15} />
                    Record voice
                  </button>
                )}
                <p className="mt-1.5 text-[11px] text-[#9495A3]">
                  Tap to record a short voice note for the assignee.
                </p>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="rounded-xl border border-[#E4E6EF] bg-[#FAFBFD] p-3">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#9495A3]">
                  Attached ({attachments.length})
                </p>
                <ul className="space-y-2">
                  {attachments.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-lg bg-white px-3 py-2 ${
                        item.kind === "voice" ? "space-y-2" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#14141A]">
                            {item.kind === "voice" ? "Voice brief" : item.file.name}
                          </p>
                          <p className="text-[11px] text-[#9495A3]">
                            {formatAttachmentSize(item.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(item.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#9495A3] hover:bg-[#FDE7EA] hover:text-[#E11D2A]"
                          aria-label="Remove attachment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {item.kind === "voice" && previewUrls[item.id] && (
                        <audio
                          controls
                          controlsList="nodownload"
                          preload="metadata"
                          className="h-9 w-full"
                        >
                          <source
                            src={previewUrls[item.id]}
                            type={item.file.type || "audio/webm"}
                          />
                        </audio>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-[#E11D2A]">{error}</p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E4E6EF] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E4E6EF] px-4 py-2.5 text-sm font-bold text-[#6B6C7A] transition hover:bg-[#F4F5FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  accent = "#E11D2A",
}: {
  icon: typeof Pin;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <div
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{
            background: checked ? `${accent}18` : "#EEF1F6",
            color: checked ? accent : "#9495A3",
          }}
        >
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#14141A]">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#9495A3]">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full transition"
        style={{
          background: checked ? accent : "#D8DBE8",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}
