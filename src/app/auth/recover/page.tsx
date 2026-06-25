"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/brand-logo";

type Status = "loading" | "error";

function RecoverForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function verifyLink() {
      const errorCode = searchParams.get("error");
      if (errorCode) {
        setError(
          errorCode === "auth_callback_failed"
            ? "This reset link could not be verified. Request a new one from your email."
            : "This reset link is invalid or has expired.",
        );
        setStatus("error");
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const supabase = createClient();
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            window.history.replaceState(null, "", "/auth/recover");
            router.replace("/reset-password");
            return;
          }
          setError(sessionError.message);
          setStatus("error");
          return;
        }
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") ?? "recovery";
      const code = searchParams.get("code");

      if (tokenHash || code) {
        const params = new URLSearchParams();
        if (tokenHash) params.set("token_hash", tokenHash);
        if (type) params.set("type", type);
        if (code) params.set("code", code);
        window.location.replace(`/auth/recover/confirm?${params.toString()}`);
        return;
      }

      setError("This reset link is invalid or has expired.");
      setStatus("error");
    }

    void verifyLink();
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
        <div className="w-full max-w-md text-center">
          <BrandLogo
            size="lg"
            layout="vertical"
            tagline="Team Tasks Manager"
            textClassName="text-white"
          />
          <p className="mt-6 text-sm font-semibold text-[#E11D2A]">{error}</p>
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
