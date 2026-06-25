"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
};

export function ResetPasswordGate({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            window.history.replaceState(null, "", "/reset-password");
            if (!cancelled) setReady(true);
            return;
          }
        }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace("/reset-password");
          if (!cancelled) setReady(true);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        if (user) {
          setReady(true);
        } else {
          router.replace("/login?error=session_expired");
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#1A1320_0%,#0A0A10_55%)] p-6">
        <p className="text-sm font-semibold text-[#8A8B99]">
          Verifying reset link…
        </p>
      </div>
    );
  }

  return children;
}
