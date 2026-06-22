import { Settings } from "lucide-react";
import { requireManager } from "@/lib/auth-guard";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SettingsPage() {
  await requireManager();

  return (
    <EmptyState
      icon={Settings}
      title="Settings"
      description="Team roles, sign-in emails, brands, and data management will be configured here in a later phase."
    />
  );
}
