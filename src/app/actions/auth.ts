"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureAuthUser } from "@/lib/team-profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWLIST_ERROR =
  "We couldn't find an account for that email. Ask Abdullah to add you.";

async function getAllowedUser(email: string) {
  const supabase = await createClient();
  const normalized = email.trim().toLowerCase();

  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email, name, role")
    .eq("email", normalized)
    .maybeSingle();

  return { normalized, allowed };
}

async function getSiteUrl() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "https";

  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${protocol}://${host.split(",")[0]?.trim()}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? null;
}

function authCallbackUrl(siteUrl: string | null, next?: string) {
  if (!siteUrl) return null;

  const params = new URLSearchParams();
  if (next) params.set("next", next);
  const query = params.toString();
  return query
    ? `${siteUrl}/auth/callback?${query}`
    : `${siteUrl}/auth/callback`;
}

function mapPasswordResetError(raw: string) {
  const message = raw.toLowerCase();
  if (message.includes("rate limit")) {
    return "Too many reset emails sent. Wait about an hour, or ask Abdullah to generate a reset link from Settings.";
  }
  if (message.includes("security purposes") || message.includes("after")) {
    return "Please wait 60 seconds before requesting another reset email.";
  }
  if (message.includes("redirect") || message.includes("url")) {
    return "Reset link misconfigured. Ask admin to add the production callback URL in Supabase.";
  }
  return raw && raw !== "{}" ? raw : "Could not send reset email. Check Supabase SMTP settings and try again.";
}

export async function signInWithPassword(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { error: "Email is required" };
  }
  if (!password) {
    return { error: "Password is required" };
  }

  const supabase = await createClient();
  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email, name, role")
    .eq("email", normalized)
    .maybeSingle();

  if (!allowed) {
    return { error: ALLOWLIST_ERROR };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    const message =
      error.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : error.message && error.message !== "{}"
          ? error.message
          : "Could not sign in. Try again.";
    return { error: message };
  }

  return { success: true as const };
}

export async function requestPasswordReset(email: string) {
  const { normalized, allowed } = await getAllowedUser(email);

  if (!normalized) {
    return { error: "Email is required" };
  }
  if (!allowed) {
    return { error: ALLOWLIST_ERROR };
  }

  const prepared = await ensureAuthUser(
    normalized,
    allowed.name,
    allowed.role,
  );
  if (prepared.error) {
    return { error: prepared.error };
  }

  const siteUrl = await getSiteUrl();
  const redirectTo = authCallbackUrl(siteUrl, "/reset-password");
  if (!redirectTo) {
    return { error: "App URL is not configured (NEXT_PUBLIC_SITE_URL)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo,
  });

  if (error) {
    return { error: mapPasswordResetError(error.message ?? "") };
  }

  return { success: true as const, email: normalized };
}

export async function generatePasswordResetLink(email: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "Manager") {
    return { error: "Only managers can generate reset links." };
  }

  const { normalized, allowed } = await getAllowedUser(email);
  if (!normalized) {
    return { error: "Email is required." };
  }
  if (!allowed) {
    return { error: ALLOWLIST_ERROR };
  }

  const prepared = await ensureAuthUser(
    normalized,
    allowed.name,
    allowed.role,
  );
  if (prepared.error) {
    return { error: prepared.error };
  }

  const siteUrl = await getSiteUrl();
  const redirectTo = authCallbackUrl(siteUrl, "/reset-password");
  if (!redirectTo) {
    return { error: "App URL is not configured (NEXT_PUBLIC_SITE_URL)." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: normalized,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    const message =
      error?.message && error.message !== "{}"
        ? error.message
        : "Could not generate reset link.";
    return { error: message };
  }

  return {
    success: true as const,
    email: normalized,
    link: data.properties.action_link,
  };
}

export async function updatePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Request a new reset link." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    const message =
      error.message && error.message !== "{}"
        ? error.message
        : "Could not update password. Try again.";
    return { error: message };
  }

  return { success: true as const };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  if (!currentPassword) {
    return { error: "Current password is required." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }
  if (currentPassword === newPassword) {
    return { error: "New password must be different from your current password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "You must be signed in to change your password." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    const message =
      error.message && error.message !== "{}"
        ? error.message
        : "Could not update password. Try again.";
    return { error: message };
  }

  return { success: true as const };
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
