import { getMyTasks } from "@/app/actions/tasks";
import { MyTasksView } from "@/components/mine/my-tasks-view";
import { requireProfile } from "@/lib/auth-guard";

export default async function MyTasksPage() {
  const profile = await requireProfile();
  const tasks = await getMyTasks();

  return <MyTasksView profile={profile} tasks={tasks} />;
}
