"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Code2,
  Crown,
  Mail,
  Palette,
  Star,
  TrendingUp,
} from "lucide-react";
import { directSignIn, sendMagicLink } from "@/app/actions/auth";
import { DIRECT_SIGN_IN_EMAIL, ROLE_META, type UserRole } from "@/lib/constants";
import type { AllowedEmail } from "@/lib/types";

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  Manager: Crown,
  "Team Lead": Star,
  Developer: Code2,
  Designer: Palette,
  SEO: TrendingUp,
};

type Props = {
  allowedEmails: AllowedEmail[];
  demoAuthEnabled?: boolean;
};

export function LockScreen({ allowedEmails, demoAuthEnabled = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const isDirectSignIn = email.trim().toLowerCase() === DIRECT_SIGN_IN_EMAIL;
  const instantSignIn = demoAuthEnabled || isDirectSignIn;

  function handleChipClick(personEmail: string) {
    const value = personEmail.trim().toLowerCase();
    setEmail(value);
    setError("");

    if (demoAuthEnabled || value === DIRECT_SIGN_IN_EMAIL) {
      handleSignIn(value);
    }
  }

  function handleSignIn(address?: string) {
    const value = (address ?? email).trim().toLowerCase();
    if (!value) {
      setError("Enter your @tgtnexus.net work email.");
      return;
    }
    setEmail(value);
    setError("");
    startTransition(async () => {
      if (demoAuthEnabled || value === DIRECT_SIGN_IN_EMAIL) {
        const result = demoAuthEnabled
          ? await sendMagicLink(value)
          : await directSignIn(value);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/");
        router.refresh();
        return;
      }

      const result = await sendMagicLink(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTargetEmail(result.email ?? value);
      setStep("sent");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-2xl">
            <div className="text-center">
              <div className="text-xl font-extrabold tracking-tight text-[#14141A]">
                TGT Nexus
              </div>
              <div className="text-xs font-semibold text-[#6B6C7A]">
                Team Tasks Manager
              </div>
            </div>
          </div>
        </div>

        {step === "email" ? (
          <>
            <p className="mb-5 text-center text-sm text-[#8A8B99]">
              {demoAuthEnabled
                ? "Dev mode — tap your email to sign in instantly"
                : "Sign in with your work Outlook email"}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  placeholder="you@tgtnexus.net"
                  className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#E11D2A]"
                />
              </div>
              {error && (
                <p className="mb-3 text-xs font-medium text-[#E11D2A]">{error}</p>
              )}
              <button
                type="button"
                onClick={() => handleSignIn()}
                disabled={pending}
                className="w-full rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 disabled:opacity-60"
              >
                {pending
                  ? instantSignIn
                    ? "Signing in…"
                    : "Sending…"
                  : instantSignIn
                    ? "Sign in"
                    : "Send sign-in link"}
              </button>

              {allowedEmails.length > 0 && (
                <div className="mt-4 border-t border-[#E4E6EF] pt-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9495A3]">
                    {demoAuthEnabled
                      ? "Team emails — tap to sign in"
                      : "Team emails (Abdullah signs in directly; others tap to fill)"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedEmails.map((person) => {
                      const meta = ROLE_META[person.role];
                      const Icon = ROLE_ICONS[person.role];
                      const selected =
                        email.toLowerCase() === person.email.toLowerCase();
                      return (
                        <button
                          key={person.email}
                          type="button"
                          onClick={() => handleChipClick(person.email)}
                          disabled={pending}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold disabled:opacity-60"
                          style={{
                            color: meta.color,
                            borderColor: selected ? meta.color : `${meta.color}30`,
                            background: selected ? `${meta.color}22` : `${meta.color}12`,
                          }}
                        >
                          <Icon size={11} strokeWidth={2.7} />
                          {person.email}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#DCF7EC]">
              <Mail size={22} className="text-[#059669]" />
            </div>
            <h2 className="mb-1 text-lg font-extrabold">Check your inbox</h2>
            <p className="text-sm text-[#14141A]">A sign-in link was sent to</p>
            <p className="mb-4 text-sm font-bold">{targetEmail}</p>
            <p className="mb-4 text-xs leading-relaxed text-[#9495A3]">
              Open Outlook and click the sign-in link for{" "}
              <span className="font-semibold text-[#14141A]">{targetEmail}</span>.
              You will be logged in after clicking the link. Check spam if it
              does not arrive within a minute.
            </p>
            {error && (
              <p className="mb-3 text-xs font-medium text-[#E11D2A]">{error}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setEmail("");
                setError("");
              }}
              className="text-xs font-semibold text-[#6B6C7A]"
            >
              Use a different email
            </button>
            <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-[#9495A3]">
              <CheckCircle2 size={12} />
              The link expires after a short time for security.
            </p>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-[#5C5C6A]">
          Only people added by Abdullah can sign in.
        </p>
      </div>
    </div>
  );
}
