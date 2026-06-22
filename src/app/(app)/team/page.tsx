import { requireLead } from "@/lib/auth-guard";
import { getTeamWorkload } from "@/app/actions/tasks";
import { TeamView } from "@/components/team/team-view";

export default async function TeamPage() {
  await requireLead();
  const members = await getTeamWorkload();

  return <TeamView members={members} />;
}
