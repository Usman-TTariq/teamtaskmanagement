"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { canAssign } from "@/lib/permissions";
import type { Brand, Profile } from "@/lib/types";

type TaskModalContextValue = {
  openCreateTask: (assigneeId?: string) => void;
};

const TaskModalContext = createContext<TaskModalContextValue | null>(null);

export function useTaskModal() {
  const ctx = useContext(TaskModalContext);
  if (!ctx) {
    throw new Error("useTaskModal must be used within TaskModalProvider");
  }
  return ctx;
}

type Props = {
  profile: Profile;
  brands: Brand[];
  members: Profile[];
  children: React.ReactNode;
};

export function TaskModalProvider({
  profile,
  brands,
  members,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [presetAssigneeId, setPresetAssigneeId] = useState<string | undefined>();

  const assignableMembers = useMemo(
    () => members.filter((m) => m.id !== profile.id),
    [members, profile.id],
  );

  const openCreateTask = useCallback((assigneeId?: string) => {
    setPresetAssigneeId(assigneeId);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPresetAssigneeId(undefined);
  }, []);

  const canCreate = canAssign(profile.role);

  return (
    <TaskModalContext.Provider value={{ openCreateTask }}>
      {children}
      {canCreate && open && (
        <CreateTaskModal
          profile={profile}
          brands={brands}
          members={assignableMembers}
          presetAssigneeId={presetAssigneeId}
          onClose={close}
        />
      )}
    </TaskModalContext.Provider>
  );
}

export function useTaskModalOptional() {
  return useContext(TaskModalContext);
}
