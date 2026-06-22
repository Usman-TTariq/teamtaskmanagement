"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useTaskModalOptional } from "@/components/tasks/task-modal-context";
import { BrandLogo, BrandMark } from "@/components/ui/brand-logo";
import { Avatar } from "@/components/ui/avatar";
import { VIEW_SUBTITLES } from "@/lib/constants";
import { canAssign, navItemsForRole } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

const ICONS = {
  dash: LayoutDashboard,
  team: Users,
  board: LayoutGrid,
  all: ListChecks,
  mine: ListChecks,
  settings: Settings,
} as const;

type Props = {
  profile: Profile;
  children: React.ReactNode;
  unreadNotificationCount?: number;
};

function HeaderActions({
  profile,
  unreadNotificationCount = 0,
}: {
  profile: Profile;
  unreadNotificationCount?: number;
}) {
  const taskModal = useTaskModalOptional();

  if (!canAssign(profile.role) || !taskModal) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E4E6EF] text-[#6B6C7A] transition hover:bg-[#F4F5FA] hover:text-[#14141A]"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadNotificationCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#E11D2A] px-1 text-[10px] font-extrabold text-white">
            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => taskModal.openCreateTask()}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105"
      >
        <Plus size={16} strokeWidth={2.5} />
        New task
      </button>
    </div>
  );
}

export function AppShell({
  profile,
  children,
  unreadNotificationCount = 0,
}: Props) {
  const pathname = usePathname();
  const navItems = navItemsForRole(profile.role);

  const activeKey =
    navItems.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(item.href),
    )?.key ?? navItems[0]?.key;

  const activeLabel =
    navItems.find((n) => n.key === activeKey)?.label ?? "Tasks";
  const subtitle = VIEW_SUBTITLES[activeKey] ?? "";
  const isBoard = pathname === "/board";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#EFF1F8]">
      <aside className="flex w-[240px] shrink-0 flex-col bg-gradient-to-b from-[#101019] to-[#09090E] px-3 py-5 text-white">
        <div className="mb-6 px-1">
          <BrandLogo
            size="md"
            layout="horizontal"
            tagline="Team Tasks"
            textClassName="text-white"
          />
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = ICONS[item.key as keyof typeof ICONS] ?? ListChecks;
            const active = activeKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? "bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] text-white shadow-lg shadow-red-500/25"
                    : "text-[#A9AAB8] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={17} strokeWidth={2.2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#20202B] bg-[#12121A] p-3">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={profile.name} role={profile.role} size={40} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{profile.name}</div>
              <div className="truncate text-xs text-[#A9AAB8]">
                {profile.role}
              </div>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2A2A36] px-3 py-2 text-xs font-semibold text-[#A9AAB8] transition hover:border-[#3A3A48] hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#E4E6EF] bg-white px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BrandMark size={36} className="mt-0.5 hidden sm:block" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#14141A]">
                  {activeLabel}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-[#6B6C7A]">{subtitle}</p>
                )}
              </div>
            </div>
            <HeaderActions
              profile={profile}
              unreadNotificationCount={unreadNotificationCount}
            />
          </div>
        </header>

        <div
          className={
            isBoard
              ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-[#EFF1F8] px-5 py-4"
              : "flex-1 overflow-y-auto bg-gradient-to-b from-[#F7F8FD] to-[#EFF1F8] px-8 py-6"
          }
        >
          <div className={isBoard ? "h-full min-h-0 w-full" : "mx-auto w-full max-w-6xl"}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
