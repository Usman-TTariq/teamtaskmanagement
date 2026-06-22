import { AppShell } from "@/components/layout/app-shell";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { TaskModalProvider } from "@/components/tasks/task-modal-context";
import { getCurrentProfile } from "@/app/actions/auth";
import { getTaskFormData, getUnreadNotificationCount } from "@/app/actions/tasks";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const { brands, members } = await getTaskFormData();
  const unreadNotificationCount = await getUnreadNotificationCount();

  return (
    <TaskModalProvider profile={profile} brands={brands} members={members}>
      <TaskDetailProvider profile={profile}>
        <AppShell
          profile={profile}
          unreadNotificationCount={unreadNotificationCount}
        >
          {children}
        </AppShell>
      </TaskDetailProvider>
    </TaskModalProvider>
  );
}
