import { Settings } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth-guard";
import { canConfigure } from "@/lib/permissions";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const isManager = canConfigure(profile.role);

  return (
    <div className="space-y-6">
      <ChangePasswordForm />

      {isManager && (
        <EmptyState
          icon={Settings}
          title="Team configuration"
          description="Team roles, sign-in emails, brands, and data management will be configured here in a later phase."
        />
      )}
    </div>
  );
}
