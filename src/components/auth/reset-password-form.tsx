"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { updatePassword } from "@/app/actions/auth";
import { BrandLogo } from "@/components/ui/brand-logo";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!password) {
      setError("Enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo
            size="lg"
            layout="vertical"
            tagline="Team Tasks Manager"
            textClassName="text-white"
          />
        </div>

        <p className="mb-5 text-center text-sm text-[#8A8B99]">
          Choose a new password for your account
        </p>
        <div className="rounded-2xl bg-white p-5 shadow-2xl">
          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            New password
          </label>
          <div className="relative mb-3">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              autoFocus
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#E11D2A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6C7A] hover:text-[#14141A]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            Confirm password
          </label>
          <div className="relative mb-3">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Repeat your password"
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#E11D2A]"
            />
          </div>

          {error && (
            <p className="mb-3 text-xs font-medium text-[#E11D2A]">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save password"}
          </button>
        </div>

        <p className="mt-5 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#8A8B99] hover:text-white"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
