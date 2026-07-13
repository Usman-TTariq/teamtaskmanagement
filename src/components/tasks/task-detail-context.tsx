"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { BoardTask, Profile } from "@/lib/types";

type TaskDetailContextValue = {
  openTaskDetail: (taskId: string, preview?: BoardTask) => void;
};

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function useTaskDetail() {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) {
    throw new Error("useTaskDetail must be used within TaskDetailProvider");
  }
  return ctx;
}

export function useTaskDetailOptional() {
  return useContext(TaskDetailContext);
}

type Props = {
  profile: Profile;
  children: React.ReactNode;
};

export function TaskDetailProvider({ profile, children }: Props) {
  const [openTask, setOpenTask] = useState<{
    id: string;
    preview?: BoardTask;
  } | null>(null);

  const openTaskDetail = useCallback((id: string, preview?: BoardTask) => {
    setOpenTask({ id, preview });
  }, []);

  const close = useCallback(() => {
    setOpenTask(null);
  }, []);

  return (
    <TaskDetailContext.Provider value={{ openTaskDetail }}>
      {children}
      {openTask && (
        <TaskDetailModal
          key={openTask.id}
          taskId={openTask.id}
          preview={openTask.preview}
          profile={profile}
          onClose={close}
        />
      )}
    </TaskDetailContext.Provider>
  );
}
