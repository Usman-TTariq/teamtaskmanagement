import { requireLead } from "@/lib/auth-guard";
import { getBoardTasks } from "@/app/actions/tasks";
import { BoardView } from "@/components/board/board-view";

export default async function BoardPage() {
  await requireLead();
  const tasks = await getBoardTasks();

  return <BoardView tasks={tasks} />;
}
