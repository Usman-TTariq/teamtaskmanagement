"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import type { Profile } from "@/lib/types";

type TaskDetailContextValue = {
  openTaskDetail: (taskId: string) => void;
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
  const [taskId, setTaskId] = useState<string | null>(null);

  const openTaskDetail = useCallback((id: string) => {
    setTaskId(id);
  }, []);

  const close = useCallback(() => {
    setTaskId(null);
  }, []);

  return (
    <TaskDetailContext.Provider value={{ openTaskDetail }}>
      {children}
      {taskId && (
        <TaskDetailModal
          taskId={taskId}
          profile={profile}
          onClose={close}
        />
      )}
    </TaskDetailContext.Provider>
  );
}
