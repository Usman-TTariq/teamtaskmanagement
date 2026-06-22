import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/app/actions/auth";
import { canAssign, canConfigure } from "@/lib/permissions";

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireLead() {
  const profile = await requireProfile();
  if (!canAssign(profile.role)) redirect("/mine");
  return profile;
}

export async function requireManager() {
  const profile = await requireProfile();
  if (!canConfigure(profile.role)) redirect("/");
  return profile;
}
