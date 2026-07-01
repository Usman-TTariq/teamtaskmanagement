import { ASSIGN_ROLES, type UserRole } from "@/lib/constants";
import type { Profile } from "@/lib/types";

type AssignCapable =
  | Pick<Profile, "role" | "can_assign_tasks">
  | UserRole
  | null
  | undefined;

export function isLeadOrManager(role: UserRole | null | undefined) {
  return role != null && ASSIGN_ROLES.includes(role);
}

export function isManager(role: UserRole | null | undefined) {
  return role === "Manager";
}

export function canAssign(input: AssignCapable) {
  if (input == null) return false;
  if (typeof input === "string") {
    return ASSIGN_ROLES.includes(input);
  }
  if (input.can_assign_tasks === true) return true;
  return ASSIGN_ROLES.includes(input.role);
}

export function canConfigure(role: UserRole | null | undefined) {
  return isManager(role);
}

export type NavItem = {
  key: string;
  label: string;
  href: string;
};

export function navItemsForRole(
  profile: Pick<Profile, "role" | "can_assign_tasks"> | null | undefined,
): NavItem[] {
  if (canAssign(profile)) {
    const items: NavItem[] = [
      { key: "dash", label: "Dashboard", href: "/" },
      { key: "team", label: "Team", href: "/team" },
      { key: "board", label: "Board", href: "/board" },
      { key: "all", label: "All tasks", href: "/all" },
    ];
    if (canConfigure(profile?.role)) {
      items.push({ key: "settings", label: "Settings", href: "/settings" });
    }
    return items;
  }

  return [
    { key: "mine", label: "My tasks", href: "/mine" },
    { key: "settings", label: "Settings", href: "/settings" },
  ];
}
