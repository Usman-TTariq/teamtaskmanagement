import { getAllTasks, getTaskFormData } from "@/app/actions/tasks";
import { AllTasksView } from "@/components/all/all-tasks-view";
import { requireLead } from "@/lib/auth-guard";

export default async function AllTasksPage() {
  await requireLead();

  const [{ brands, members }, tasks] = await Promise.all([
    getTaskFormData(),
    getAllTasks(),
  ]);

  return <AllTasksView tasks={tasks} brands={brands} members={members} />;
}
