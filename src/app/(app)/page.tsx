import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Pin,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  getBoardTasks,
  getDashboardStats,
  getReviewQueue,
} from "@/app/actions/tasks";
import { BoardTaskCard } from "@/components/board/board-task-card";
import { ReviewQueue } from "@/components/dashboard/review-queue";
import { requireLead } from "@/lib/auth-guard";
import { canAssign } from "@/lib/permissions";
import { StatCard } from "@/components/ui/stat-card";

export default async function DashboardPage() {
  const profile = await requireLead();
  if (!canAssign(profile.role)) redirect("/mine");

  const [reviewTasks, stats, boardTasks] = await Promise.all([
    getReviewQueue(),
    getDashboardStats(),
    getBoardTasks(),
  ]);

  const reviewWithResponse = reviewTasks.filter((t) => t.hasUnreadResponse).length;
  const pinnedTasks = boardTasks.filter((t) => t.pinned);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting review"
          value={reviewTasks.length}
          sub={
            reviewWithResponse > 0
              ? `${reviewWithResponse} new response${reviewWithResponse > 1 ? "s" : ""}`
              : "Assigned to you"
          }
          grad="linear-gradient(135deg,#FBBF24,#D97706)"
          glow="rgba(217,119,6,.28)"
          icon={Clock}
        />
        <StatCard
          label="Total tasks"
          value={stats.totalTasks}
          sub={`${stats.addedThisWeek} added this week`}
          grad="linear-gradient(135deg,#A78BFA,#6366F1)"
          glow="rgba(122,92,255,.28)"
          icon={Layers}
        />
        <StatCard
          label="Completed"
          value={stats.completedCount}
          sub={
            stats.totalTasks > 0
              ? `${stats.completedThisWeek} this week · ${stats.donePercent}% overall`
              : "No tasks yet"
          }
          grad="linear-gradient(135deg,#34D399,#059669)"
          glow="rgba(5,150,105,.28)"
          icon={CheckCircle2}
        />
        <StatCard
          label="Overdue"
          value={stats.overdueCount}
          sub={stats.overdueCount === 0 ? "All on track" : "Needs attention"}
          grad="linear-gradient(135deg,#FF5A72,#E11D2A)"
          glow="rgba(225,29,42,.28)"
          icon={AlertTriangle}
        />
      </section>

      <ReviewQueue tasks={reviewTasks} />

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-[#E4E6EF] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,40,.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-[#E11D2A]" />
            <h3 className="text-sm font-extrabold">Task path</h3>
          </div>
          <div
            className="mx-auto grid h-28 w-28 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#059669 ${stats.donePercent}%, #EDEFF6 ${stats.donePercent}%)`,
            }}
          >
            <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">
              <div className="text-center">
                <div className="text-3xl font-extrabold">{stats.donePercent}%</div>
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#9495A3]">
                  DONE
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[#6B6C7A]">
            {stats.completedCount} of {stats.totalTasks} tasks completed
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E6EF] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,40,.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Pin size={16} className="text-[#E11D2A]" />
            <h3 className="text-sm font-extrabold">Pinned today</h3>
            <span className="text-xs font-bold text-[#9495A3]">
              ({pinnedTasks.length})
            </span>
          </div>
          {pinnedTasks.length === 0 ? (
            <p className="text-sm text-[#6B6C7A]">
              No pinned tasks. Pin work from the board or task detail view.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pinnedTasks.slice(0, 4).map((task) => (
                <BoardTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
