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

function getRedirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (
    forwardedHost &&
    !forwardedHost.startsWith("localhost") &&
    !forwardedHost.startsWith("127.0.0.1")
  ) {
    return `${forwardedProto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  return request.nextUrl.origin;
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
