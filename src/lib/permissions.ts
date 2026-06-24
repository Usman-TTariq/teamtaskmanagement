import { ASSIGN_ROLES, type UserRole } from "@/lib/constants";

export function isLeadOrManager(role: UserRole | null | undefined) {
  return role != null && ASSIGN_ROLES.includes(role);
}

export function isManager(role: UserRole | null | undefined) {
  return role === "Manager";
}

export function canAssign(role: UserRole | null | undefined) {
  return isLeadOrManager(role);
}

export function canConfigure(role: UserRole | null | undefined) {
  return isManager(role);
}

export type NavItem = {
  key: string;
  label: string;
  href: string;
};

export function navItemsForRole(role: UserRole | null | undefined): NavItem[] {
  if (canAssign(role)) {
    const items: NavItem[] = [
      { key: "dash", label: "Dashboard", href: "/" },
      { key: "team", label: "Team", href: "/team" },
      { key: "board", label: "Board", href: "/board" },
      { key: "all", label: "All tasks", href: "/all" },
    ];
    if (canConfigure(role)) {
      items.push({ key: "settings", label: "Settings", href: "/settings" });
    }
    return items;
  }

  return [
    { key: "mine", label: "My tasks", href: "/mine" },
    { key: "settings", label: "Settings", href: "/settings" },
  ];
}
