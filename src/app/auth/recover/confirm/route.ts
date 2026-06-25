import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRedirectOrigin } from "@/lib/auth-redirect";

export async function POST(request: NextRequest) {
  const origin = getRedirectOrigin(request);
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash")?.toString();
  const type = formData.get("type")?.toString() ?? "recovery";
  const code = formData.get("code")?.toString();

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
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
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
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`);
}
