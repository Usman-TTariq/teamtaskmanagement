"use server";

import { redirect } from "next/navigation";
import { DIRECT_SIGN_IN_EMAIL } from "@/lib/constants";
import { ensureAuthUser } from "@/lib/team-profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { error: "Email is required" };
  }

  const supabase = await createClient();

  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email, name, role")
    .eq("email", normalized)
    .maybeSingle();

  if (!allowed) {
    return {
      error: "We couldn't find an account for that email. Ask Abdullah to add you.",
    };
  }

  const prepared = await ensureAuthUser(
    normalized,
    allowed.name,
    allowed.role,
  );
  if (prepared.error) {
    return { error: prepared.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return { error: "App URL is not configured (NEXT_PUBLIC_SITE_URL)." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    const message =
      error.message && error.message !== "{}"
        ? error.message
        : "Could not send sign-in email. Ask admin to configure Supabase SMTP for @tgtnexus.net.";
    return { error: message };
  }

  return { success: true, email: normalized };
}

export async function directSignIn(email: string) {
  const normalized = email.trim().toLowerCase();

  if (normalized !== DIRECT_SIGN_IN_EMAIL) {
    return { error: "Direct sign-in is only available for the manager account." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email, name, role")
    .eq("email", normalized)
    .maybeSingle();

  if (!allowed) {
    return {
      error: "We couldn't find an account for that email. Ask Abdullah to add you.",
    };
  }

  const prepared = await ensureAuthUser(
    normalized,
    allowed.name,
    allowed.role,
  );
  if (prepared.error) {
    return { error: prepared.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
      options: siteUrl
        ? { redirectTo: `${siteUrl}/auth/callback` }
        : undefined,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    const message =
      linkError?.message && linkError.message !== "{}"
        ? linkError.message
        : "Could not sign in. Try again in a moment.";
    return { error: message };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    return { error: verifyError.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}
