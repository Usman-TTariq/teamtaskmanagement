import { getRedirectOrigin } from "@/lib/auth-redirect";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function resolveRedirectPath(type: string | null, next: string | null) {
  if (next) {
    const decoded = decodeURIComponent(next);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
  }
  if (type === "recovery" || type === "invite") return "/reset-password";
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const origin = getRedirectOrigin(request);

  if (type === "recovery" || next === "/reset-password") {
    const recoverUrl = new URL("/auth/recover", origin);
    if (code) recoverUrl.searchParams.set("code", code);
    if (token_hash) recoverUrl.searchParams.set("token_hash", token_hash);
    if (type) recoverUrl.searchParams.set("type", type);
    return NextResponse.redirect(recoverUrl);
  }

  const redirectPath = resolveRedirectPath(type, next);

  if (error) {
    const message = encodeURIComponent(errorDescription ?? error);
    return NextResponse.redirect(
      `${origin}/login?error=${message}`,
    );
  }

  let response = NextResponse.redirect(`${origin}${redirectPath}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return response;
    }

    console.error("auth callback code exchange:", exchangeError.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`,
    );
  }

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as
        | "email"
        | "magiclink"
        | "signup"
        | "recovery"
        | "invite",
    });

    if (!verifyError) {
      return response;
    }

    console.error("auth callback otp verify:", verifyError.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
