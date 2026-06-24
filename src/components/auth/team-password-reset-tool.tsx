"use client";

import { useState, useTransition } from "react";
import { Copy, Link2 } from "lucide-react";
import { generatePasswordResetLink } from "@/app/actions/auth";
import type { AllowedEmail } from "@/lib/types";

type Props = {
  allowedEmails: AllowedEmail[];
};

export function TeamPasswordResetTool({ allowedEmails }: Props) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Select or enter a team email.");
      return;
    }

    setError("");
    setLink("");
    setCopied(false);
    startTransition(async () => {
      const result = await generatePasswordResetLink(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLink(result.link ?? "");
    });
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-[#E4E6EF] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-extrabold text-[#14141A]">
        Generate password reset link
      </h2>
      <p className="mb-5 text-sm text-[#6B6C7A]">
        Use this when SMTP emails are not arriving. Copy the link and send it
        to the team member directly.
      </p>

      <div className="max-w-xl space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#6B6C7A]">
            Team email
          </label>
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#E4E6EF] px-3 py-2.5 text-sm outline-none focus:border-[#E11D2A]"
          >
            <option value="">Select a team member</option>
            {allowedEmails.map((person) => (
              <option key={person.email} value={person.email}>
                {person.name} ({person.email})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs font-medium text-[#E11D2A]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 disabled:opacity-60"
        >
          <Link2 size={16} />
          {pending ? "Generating…" : "Generate link"}
        </button>

        {link && (
          <div className="rounded-xl border border-[#E4E6EF] bg-[#F7F8FD] p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9495A3]">
              Reset link (expires soon)
            </p>
            <p className="mb-3 break-all text-xs text-[#14141A]">{link}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E4E6EF] bg-white px-3 py-2 text-xs font-semibold text-[#14141A] hover:bg-[#F4F5FA]"
            >
              <Copy size={14} />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
