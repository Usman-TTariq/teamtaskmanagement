"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Code2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Palette,
  Star,
  TrendingUp,
} from "lucide-react";
import { signInWithPassword } from "@/app/actions/auth";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ROLE_META, type UserRole } from "@/lib/constants";
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
};

export function LockScreen({ allowedEmails }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleChipClick(personEmail: string) {
    setEmail(personEmail.trim().toLowerCase());
    setError("");
  }

  function handleSignIn() {
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Enter your @tgtnexus.net work email.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setEmail(value);
    setError("");
    startTransition(async () => {
      const result = await signInWithPassword(value, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.assign("/");
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
          Sign in with your work email and password
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
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="you@tgtnexus.net"
              className="w-full rounded-xl border border-[#E4E6EF] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#E11D2A]"
            />
          </div>

          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            Password
          </label>
          <div className="relative mb-1">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6C7A]"
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="Your password"
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

          <div className="mb-3 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#6B6C7A] hover:text-[#E11D2A]"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="mb-3 text-xs font-medium text-[#E11D2A]">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>

          {allowedEmails.length > 0 && (
            <div className="mt-4 border-t border-[#E4E6EF] pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9495A3]">
                Team emails — tap to fill
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

        <p className="mt-5 text-center text-xs text-[#5C5C6A]">
          Only people added by Abdullah can sign in. First time? Use{" "}
          <Link href="/forgot-password" className="font-semibold text-[#8A8B99] hover:text-white">
            Forgot password
          </Link>{" "}
          to set yours.
        </p>
      </div>
    </div>
  );
}
