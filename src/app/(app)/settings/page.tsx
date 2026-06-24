import { Settings } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { TeamPasswordResetTool } from "@/components/auth/team-password-reset-tool";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth-guard";
import { canConfigure } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { AllowedEmail } from "@/lib/types";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const isManager = canConfigure(profile.role);

  let allowedEmails: AllowedEmail[] = [];
  if (isManager) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("allowed_emails")
      .select("email, name, role")
      .order("email");
    allowedEmails = (data ?? []) as AllowedEmail[];
  }

  return (
    <div className="space-y-6">
      <ChangePasswordForm />

      {isManager && (
        <>
          <TeamPasswordResetTool allowedEmails={allowedEmails} />
          <EmptyState
            icon={Settings}
            title="Team configuration"
            description="Team roles, sign-in emails, brands, and data management will be configured here in a later phase."
          />
        </>
      )}
    </div>
  );
}
