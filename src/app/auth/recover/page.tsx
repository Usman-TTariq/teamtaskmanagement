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
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
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
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery",
        });
        if (!otpError) {
          router.replace("/reset-password");
          return;
        }
        setError(otpError.message);
        setStatus("error");
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: codeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!codeError) {
          router.replace("/reset-password");
          return;
        }
        setError(
          "This reset link could not be verified. Request a new link from the forgot-password page.",
        );
        setStatus("error");
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
