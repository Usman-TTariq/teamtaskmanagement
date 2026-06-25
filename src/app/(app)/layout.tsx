import { AppShell } from "@/components/layout/app-shell";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { TaskModalProvider } from "@/components/tasks/task-modal-context";
import { getCurrentProfile } from "@/app/actions/auth";
import { getUnreadNotificationCountForProfile } from "@/app/actions/notifications";
import { getTaskFormDataForProfile } from "@/app/actions/tasks";
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

  const [{ brands, members }, unreadNotificationCount] = await Promise.all([
    getTaskFormDataForProfile(),
    getUnreadNotificationCountForProfile(profile),
  ]);

  return (
    <TaskModalProvider profile={profile} brands={brands} members={members}>
      <TaskDetailProvider profile={profile}>
        <NotificationProvider
          profileId={profile.id}
          initialUnreadCount={unreadNotificationCount}
        >
          <AppShell profile={profile}>{children}</AppShell>
        </NotificationProvider>
      </TaskDetailProvider>
    </TaskModalProvider>
  );
}
