import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRedirectOrigin } from "@/lib/auth-redirect";

async function completeRecovery(
  request: NextRequest,
  tokenHash: string | null,
  type: string,
  code: string | null,
) {
  const origin = getRedirectOrigin(request);
  let response = NextResponse.redirect(`${origin}/reset-password`);

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("recover code exchange:", error.message);
    return NextResponse.redirect(
      `${origin}/auth/recover?error=auth_callback_failed`,
    );
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "invite" | "email" | "signup" | "magiclink",
    });
    if (!error) {
      return response;
    }
    console.error("recover otp verify:", error.message);
    return NextResponse.redirect(
      `${origin}/auth/recover?error=invalid_reset_link`,
    );
  }

  return NextResponse.redirect(`${origin}/auth/recover?error=invalid_reset_link`);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") ?? "recovery";
  const code = request.nextUrl.searchParams.get("code");

  return completeRecovery(request, tokenHash, type, code);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash")?.toString() ?? null;
  const type = formData.get("type")?.toString() ?? "recovery";
  const code = formData.get("code")?.toString() ?? null;

  return completeRecovery(request, tokenHash, type, code);
}
