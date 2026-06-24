"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { changePassword } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!currentPassword) {
      setError("Enter your current password.");
      setSuccess("");
      return;
    }
    if (!newPassword) {
      setError("Enter a new password.");
      setSuccess("");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      setSuccess("");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    });
  }

  return (
    <div className="rounded-2xl border border-[#E4E6EF] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-extrabold text-[#14141A]">
        Change password
      </h2>
      <p className="mb-5 text-sm text-[#6B6C7A]">
        Update the password you use to sign in.
      </p>

      <div className="max-w-md space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            Current password
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              type={showPasswords ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#E11D2A]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            New password
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#E11D2A]"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6C7A] hover:text-[#14141A]"
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            >
              {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            Confirm new password
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#E11D2A]"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium text-[#E11D2A]">{error}</p>
        )}
        {success && (
          <p className="text-xs font-medium text-[#059669]">{success}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </div>
  );
}
