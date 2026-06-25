import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ResetPasswordGate } from "@/components/auth/reset-password-gate";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
          <p className="text-sm font-semibold text-[#8A8B99]">
            Verifying reset link…
          </p>
        </div>
      }
    >
      <ResetPasswordGate>
        <ResetPasswordForm />
      </ResetPasswordGate>
    </Suspense>
  );
}
