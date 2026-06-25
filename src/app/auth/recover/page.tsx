"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";

function RecoverForm() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";
  const code = searchParams.get("code");

  useEffect(() => {
    if (tokenHash || code) {
      formRef.current?.requestSubmit();
    }
  }, [tokenHash, code]);

  if (!tokenHash && !code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
        <div className="w-full max-w-md text-center">
          <BrandLogo
            size="lg"
            layout="vertical"
            tagline="Team Tasks Manager"
            textClassName="text-white"
          />
          <p className="mt-6 text-sm font-semibold text-[#E11D2A]">
            This reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-semibold text-white hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
      <div className="w-full max-w-md text-center">
        <BrandLogo
          size="lg"
          layout="vertical"
          tagline="Team Tasks Manager"
          textClassName="text-white"
        />
        <p className="mt-6 text-sm font-semibold text-[#8A8B99]">
          Verifying your reset link…
        </p>
        <form ref={formRef} method="POST" action="/auth/recover/confirm" className="mt-4">
          {tokenHash && (
            <input type="hidden" name="token_hash" value={tokenHash} />
          )}
          {type && <input type="hidden" name="type" value={type} />}
          {code && <input type="hidden" name="code" value={code} />}
          <noscript>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-5 py-2.5 text-sm font-bold text-white"
            >
              Continue to reset password
            </button>
          </noscript>
        </form>
      </div>
    </div>
  );
}

export default function RecoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
          <p className="text-sm font-semibold text-[#8A8B99]">
            Verifying your reset link…
          </p>
        </div>
      }
    >
      <RecoverForm />
    </Suspense>
  );
}
