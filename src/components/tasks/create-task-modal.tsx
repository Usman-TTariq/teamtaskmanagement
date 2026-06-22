"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mic,
  Paperclip,
  Pin,
  Plus,
  X,
} from "lucide-react";
import { createTask } from "@/app/actions/tasks";
import {
  CATEGORIES,
  COLORS,
  PRIORITIES,
  type TaskCategory,
  type TaskPriority,
} from "@/lib/constants";
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

export function CreateTaskModal({
  profile,
  brands,
  members,
  presetAssigneeId,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [category, setCategory] = useState<TaskCategory>("Development");
  const [assigneeId, setAssigneeId] = useState(
    presetAssigneeId ?? members[0]?.id ?? "",
  );
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

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

  const assignee = members.find((m) => m.id === assigneeId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const hours = estimatedHours.trim()
      ? Number.parseFloat(estimatedHours)
      : null;

    startTransition(async () => {
      const result = await createTask({
        title,
        description,
        brandId,
        category,
        assigneeId,
        priority,
        deadline: deadline || null,
        estimatedHours: hours != null && !Number.isNaN(hours) ? hours : null,
        pinned,
        hidden,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
    });
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
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className={inputClass}
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
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
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8DBE8] bg-[#FAFBFD] px-3 py-2.5 text-sm font-semibold text-[#9495A3]"
                >
                  <Paperclip size={15} />
                  Add files
                </button>
                <p className="mt-1.5 text-[11px] text-[#9495A3]">
                  5MB per file, any type. (Coming in Phase 4)
                </p>
              </div>
              <div>
                <label className={labelClass}>Voice brief</label>
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8DBE8] bg-[#FAFBFD] px-3 py-2.5 text-sm font-semibold text-[#9495A3]"
                >
                  <Mic size={15} />
                  Record voice
                </button>
              </div>
            </div>
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
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 disabled:opacity-60"
            >
              <Plus size={16} strokeWidth={2.5} />
              {pending ? "Creating…" : "Create task"}
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
