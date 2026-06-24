"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { BrandLogo } from "@/components/ui/brand-logo";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Enter your @tgtnexus.net work email.");
      return;
    }

    setEmail(value);
    setError("");
    startTransition(async () => {
      const result = await requestPasswordReset(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTargetEmail(result.email ?? value);
      setSent(true);
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

        {!sent ? (
          <>
            <p className="mb-5 text-center text-sm text-[#8A8B99]">
              Enter your work email and we&apos;ll send a link to set or reset
              your password
            </p>
            <div className="rounded-2xl bg-white p-5 shadow-2xl">
              <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
                Work email
              </label>
              <div className="relative mb-3">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
                />
                <input
                  autoFocus
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="you@tgtnexus.net"
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
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#DCF7EC]">
              <Mail size={22} className="text-[#059669]" />
            </div>
            <h2 className="mb-1 text-lg font-extrabold">Check your inbox</h2>
            <p className="text-sm text-[#14141A]">A password reset link was sent to</p>
            <p className="mb-4 text-sm font-bold">{targetEmail}</p>
            <p className="mb-4 text-xs leading-relaxed text-[#9495A3]">
              Open Outlook and click the link for{" "}
              <span className="font-semibold text-[#14141A]">{targetEmail}</span>.
              You can set a new password from that page. Check spam and junk if
              it does not arrive within 2 minutes. If still nothing, ask Abdullah
              to generate a reset link from Settings.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B6C7A] hover:text-[#14141A]"
            >
              <ArrowLeft size={12} />
              Back to sign in
            </Link>
            <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-[#9495A3]">
              <CheckCircle2 size={12} />
              The link expires after a short time for security.
            </p>
          </div>
        )}

        {!sent && (
          <p className="mt-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A8B99] hover:text-white"
            >
              <ArrowLeft size={12} />
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
