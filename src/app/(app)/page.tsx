import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getReviewQueue } from "@/app/actions/tasks";
import { ReviewQueue } from "@/components/dashboard/review-queue";
import { requireLead } from "@/lib/auth-guard";
import { canAssign } from "@/lib/permissions";
import { StatCard } from "@/components/ui/stat-card";

export default async function DashboardPage() {
  const profile = await requireLead();
  if (!canAssign(profile.role)) redirect("/mine");

  const reviewTasks = await getReviewQueue();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting review"
          value={reviewTasks.length}
          sub="Assigned to you"
          grad="linear-gradient(135deg,#FBBF24,#D97706)"
          glow="rgba(217,119,6,.28)"
          icon={Clock}
        />
        <StatCard
          label="Total tasks"
          value={0}
          sub="0 added this week"
          grad="linear-gradient(135deg,#A78BFA,#6366F1)"
          glow="rgba(122,92,255,.28)"
          icon={Layers}
        />
        <StatCard
          label="Completed"
          value={0}
          sub="0% done this week"
          grad="linear-gradient(135deg,#34D399,#059669)"
          glow="rgba(5,150,105,.28)"
          icon={CheckCircle2}
        />
        <StatCard
          label="Overdue"
          value={0}
          sub="All on track"
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
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-[10px] border-[#EDEFF6]">
            <div className="text-center">
              <div className="text-3xl font-extrabold">0%</div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-[#9495A3]">
                DONE
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[#6B6C7A]">
            0 of 0 tasks completed
          </p>
        </div>

        <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#E4E6EF] bg-white p-8 text-center">
          <p className="max-w-md text-sm text-[#6B6C7A]">
            Team stats and pinned work will appear here as more tasks are
            created and completed.
          </p>
        </div>
      </section>
    </div>
  );
}
