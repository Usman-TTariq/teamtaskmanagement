import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

async function findAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  name: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) return { user: null, error: error.message };

  const normalized = email.toLowerCase();
  let user =
    data.users.find((u) => u.email?.toLowerCase() === normalized) ?? null;

  if (!user) {
    const nameKey = name.toLowerCase();
    user =
      data.users.find((u) => {
        const local = u.email?.split("@")[0]?.toLowerCase() ?? "";
        return local === nameKey || local.startsWith(`${nameKey}.`);
      }) ?? null;

    if (user) {
      const { data: updated, error: updateError } =
        await admin.auth.admin.updateUserById(user.id, { email: normalized });

      if (updateError) {
        return { user: null, error: updateError.message };
      }
      user = updated.user;
    }
  }

  return { user, error: null };
}

export async function ensureAuthUser(
  email: string,
  name: string,
  role: string,
) {
  const admin = createAdminClient();
  let { user, error } = await findAuthUser(admin, email, name);

  if (error) return { error };

  if (!user) {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: { name },
      });

    if (createError || !created.user) {
      const message =
        createError?.message && createError.message !== "{}"
          ? createError.message
          : "Could not prepare account.";
      return { error: message };
    }
    user = created.user;
  }

  await admin.from("profiles").upsert({
    id: user.id,
    email,
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
  await ensureAllTeamProfiles();

  const admin = createAdminClient();
  const { data: allowed } = await admin
    .from("allowed_emails")
    .select("email")
    .order("email");

  const emails = (allowed ?? []).map((row) => row.email.toLowerCase());
  if (!emails.length) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("is_active", true)
    .in("email", emails)
    .order("name");

  return profiles ?? [];
}

export async function removeTestAuthUser(email: string) {
  const admin = createAdminClient();
  const normalized = email.toLowerCase();

  const { data } = await admin.auth.admin.listUsers({ perPage: 100 });
  const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
  if (!user) return;

  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);
}
