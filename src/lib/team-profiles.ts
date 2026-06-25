import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

async function findAuthUserByLegacyEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  name: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) return { user: null, error: error.message };

  const normalized = email.toLowerCase();
  const nameKey = name.toLowerCase();
  const user =
    data.users.find((candidate) => {
      const local = candidate.email?.split("@")[0]?.toLowerCase() ?? "";
      return local === nameKey || local.startsWith(`${nameKey}.`);
    }) ?? null;

  if (!user) {
    return { user: null, error: null };
  }

  const { data: updated, error: updateError } =
    await admin.auth.admin.updateUserById(user.id, { email: normalized });

  if (updateError) {
    return { user: null, error: updateError.message };
  }

  return { user: updated.user, error: null };
}

export async function ensureAuthUser(
  email: string,
  name: string,
  role: string,
) {
  const admin = createAdminClient();
  const normalized = email.toLowerCase();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (existingProfile) {
    await admin.from("profiles").upsert({
      id: existingProfile.id,
      email: normalized,
      name,
      role,
      is_active: true,
    });
    return { error: null };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { name },
    });

  let user = created.user;

  if (createError || !user) {
    const alreadyExists =
      createError?.message?.toLowerCase().includes("already") ?? false;

    if (!alreadyExists) {
      const message =
        createError?.message && createError.message !== "{}"
          ? createError.message
          : "Could not prepare account.";
      return { error: message };
    }

    const legacy = await findAuthUserByLegacyEmail(admin, normalized, name);
    if (legacy.error) return { error: legacy.error };
    user = legacy.user;

    if (!user) {
      return { error: "Could not prepare account." };
    }
  }

  await admin.from("profiles").upsert({
    id: user.id,
    email: normalized,
    name,
    role,
    is_active: true,
  });

  return { error: null };
}

export async function ensureAllTeamProfiles() {
  const admin = createAdminClient();
  const [{ data: allowed, error }, { data: profiles }] = await Promise.all([
    admin.from("allowed_emails").select("email, name, role").order("email"),
    admin.from("profiles").select("email"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const existing = new Set(
    (profiles ?? []).map((row) => row.email.toLowerCase()),
  );

  for (const person of allowed ?? []) {
    if (existing.has(person.email.toLowerCase())) continue;

    const result = await ensureAuthUser(person.email, person.name, person.role);
    if (result.error) {
      console.error(`Failed to sync profile for ${person.email}:`, result.error);
    }
  }
}

export async function getTeamProfiles(): Promise<Profile[]> {
  const admin = createAdminClient();
  const [{ data: allowed }, { data: profiles }] = await Promise.all([
    admin.from("allowed_emails").select("email").order("email"),
    admin
      .from("profiles")
      .select("id, name, email, role, is_active")
      .eq("is_active", true)
      .order("name"),
  ]);

  const emails = new Set(
    (allowed ?? []).map((row) => row.email.toLowerCase()),
  );
  if (!emails.size) return [];

  return (profiles ?? []).filter((profile) =>
    emails.has(profile.email.toLowerCase()),
  );
}

export async function removeTestAuthUser(email: string) {
  const admin = createAdminClient();
  const normalized = email.toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (!profile) return;

  await admin.from("profiles").delete().eq("id", profile.id);
  await admin.auth.admin.deleteUser(profile.id);
}
