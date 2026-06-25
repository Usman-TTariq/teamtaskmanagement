"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Mic,
  Send,
  X,
} from "lucide-react";
import { addTaskComment } from "@/app/actions/tasks";
import {
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { useTaskDetailOptional } from "@/components/tasks/task-detail-context";
import { Avatar } from "@/components/ui/avatar";
import { BrandMark } from "@/components/ui/brand-logo";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";

type ToastItem = AppNotification & { visible: boolean };

type AppToastItem = {
  id: string;
  message: string;
  variant: "error" | "success";
  visible: boolean;
};

type NotificationContextValue = {
  unreadCount: number;
  panelOpen: boolean;
  notifications: AppNotification[];
  panelLoading: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  openNotification: (notification: AppNotification) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

function notificationIcon(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("assigned you")) return ClipboardList;
  if (lower.includes("voice note")) return Mic;
  if (lower.includes("commented") || lower.includes("comment")) return MessageSquare;
  if (lower.includes("approved")) return CheckCircle2;
  return Bell;
}

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type ParsedNotification = {
  senderName: string | null;
  preview: string;
  supportsReply: boolean;
};

function parseNotificationContent(message: string): ParsedNotification {
  const assignedMatch = message.match(/^(.+?) assigned you "(.+)"$/);
  if (assignedMatch) {
    return {
      senderName: assignedMatch[1],
      preview: `Assigned you “${assignedMatch[2]}”`,
      supportsReply: false,
    };
  }

  const commentMatch = message.match(/^(.+?) commented on "(.+)"(?: under review)?$/);
  if (commentMatch) {
    return {
      senderName: commentMatch[1],
      preview: commentMatch[2],
      supportsReply: true,
    };
  }

  const voiceMatch = message.match(/^(.+?) sent a voice note on "(.+)"(?: under review)?$/);
  if (voiceMatch) {
    return {
      senderName: voiceMatch[1],
      preview: `Voice note on “${voiceMatch[2]}”`,
      supportsReply: true,
    };
  }

  const submitMatch = message.match(/^(.+?) submitted "(.+)" for your review$/);
  if (submitMatch) {
    return {
      senderName: submitMatch[1],
      preview: `Submitted “${submitMatch[2]}” for review`,
      supportsReply: false,
    };
  }

  const approvedMatch = message.match(/^Your task "(.+)" was approved$/);
  if (approvedMatch) {
    return {
      senderName: null,
      preview: `“${approvedMatch[1]}” was approved`,
      supportsReply: false,
    };
  }

  return {
    senderName: null,
    preview: message,
    supportsReply: false,
  };
}

type NotificationToastCardProps = {
  toast: ToastItem;
  onDismiss: () => void;
  onOpen: () => void;
  onMarkRead: () => void;
};

function NotificationToastCard({
  toast,
  onDismiss,
  onOpen,
  onMarkRead,
}: NotificationToastCardProps) {
  const parsed = parseNotificationContent(toast.message);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const displayName = parsed.senderName ?? "Team Tasks";
  const showQuickReply = parsed.supportsReply && Boolean(toast.task_id);

  async function handleQuickReply() {
    const text = reply.trim();
    if (!text || !toast.task_id || sending) return;

    setSending(true);
    const result = await addTaskComment(toast.task_id, text);
    setSending(false);

    if (result.error) {
      window.dispatchEvent(
        new CustomEvent("app:toast", {
          detail: { message: result.error, variant: "error" },
        }),
      );
      return;
    }

    onMarkRead();
    onDismiss();
  }

  return (
    <div className="pointer-events-auto animate-[slideInUp_.35s_ease-out] overflow-hidden rounded-xl border border-[#2A2A36] bg-white shadow-[0_16px_48px_rgba(0,0,0,.35)]">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#101019] to-[#1A1320] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size={20} />
          <span className="truncate text-xs font-bold text-white">Team Tasks</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-[#FAFBFD]"
      >
        {parsed.senderName ? (
          <Avatar name={parsed.senderName} size={40} />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] text-white">
            <CheckCircle2 size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[#14141A]">{displayName}</p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[#6B6C7A]">
            {parsed.preview}
          </p>
        </div>
      </button>

      {showQuickReply && (
        <div className="border-t border-[#EEF1F6] bg-[#F4F5FA] px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-[#E4E6EF] bg-white px-3 py-2">
            <input
              type="text"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleQuickReply();
                }
              }}
              placeholder="Send a quick reply"
              disabled={sending}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#14141A] outline-none placeholder:text-[#9495A3] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleQuickReply()}
              disabled={!reply.trim() || sending}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#E11D2A] transition hover:bg-[#FFF5F6] disabled:opacity-40"
              aria-label="Send reply"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  profileId: string;
  initialUnreadCount: number;
  children: React.ReactNode;
};

export function NotificationProvider({
  profileId,
  initialUnreadCount,
  children,
}: Props) {
  const taskDetail = useTaskDetailOptional();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [appToasts, setAppToasts] = useState<AppToastItem[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());

  const syncUnreadCount = useCallback((items: AppNotification[]) => {
    setUnreadCount(items.filter((item) => !item.read).length);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (notification: AppNotification) => {
      setToasts((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [...current, { ...notification, visible: true }].slice(-4);
      });

      const timer = window.setTimeout(() => {
        dismissToast(notification.id);
      }, 12000);
      dismissTimersRef.current.set(notification.id, timer);
    },
    [dismissToast],
  );

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      dismissToast(notification.id);
      setPanelOpen(false);

      if (!notification.read) {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      if (notification.task_id) {
        taskDetail?.openTaskDetail(notification.task_id);
      }
    },
    [dismissToast, taskDetail],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const refreshNotifications = useCallback(
    async (showPopups: boolean) => {
      const items = await getRecentNotifications();
      setNotifications(items);
      syncUnreadCount(items);

      if (!initializedRef.current) {
        items.forEach((item) => knownIdsRef.current.add(item.id));
        initializedRef.current = true;

        if (showPopups) {
          for (const item of items.filter((entry) => !entry.read).slice(0, 3)) {
            pushToast(item);
          }
        }

        return items;
      }

      const newItems = items.filter((item) => !knownIdsRef.current.has(item.id));
      for (const item of newItems) {
        knownIdsRef.current.add(item.id);
        if (showPopups && !item.read) {
          pushToast(item);
        }
      }

      return items;
    },
    [pushToast, syncUnreadCount],
  );

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      const next = !open;
      if (next) {
        setPanelLoading(true);
        void refreshNotifications(false).finally(() => setPanelLoading(false));
      }
      return next;
    });
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead();
    if (result.error) return;

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("notifications:refresh"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!cancelled) {
        await refreshNotifications(true);
      }
    }

    void poll();
    const interval = window.setInterval(poll, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profileId}`,
        },
        (payload) => {
          const notification = payload.new as AppNotification;
          if (knownIdsRef.current.has(notification.id)) return;
          knownIdsRef.current.add(notification.id);
          setNotifications((current) => [notification, ...current].slice(0, 30));
          if (!notification.read) {
            pushToast(notification);
            setUnreadCount((count) => count + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      dismissTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      dismissTimersRef.current.clear();
    };
  }, [profileId, pushToast]);

  useEffect(() => {
    function onFocus() {
      void refreshNotifications(false);
    }
    function onRefresh() {
      void refreshNotifications(false);
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications:refresh", onRefresh);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications:refresh", onRefresh);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    function onAppToast(event: Event) {
      const detail = (event as CustomEvent<{ message: string; variant?: "error" | "success" }>).detail;
      if (!detail?.message) return;

      const id = crypto.randomUUID();
      setAppToasts((current) => [
        { id, message: detail.message, variant: detail.variant ?? "error", visible: true },
        ...current,
      ].slice(0, 3));

      window.setTimeout(() => {
        setAppToasts((current) => current.filter((item) => item.id !== id));
      }, 6000);
    }

    window.addEventListener("app:toast", onAppToast);
    return () => window.removeEventListener("app:toast", onAppToast);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        panelOpen,
        notifications,
        panelLoading,
        togglePanel,
        closePanel,
        openNotification,
        markAllRead,
      }}
    >
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(100vw-2rem,400px)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <NotificationToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
            onOpen={() => void openNotification(toast)}
            onMarkRead={() => {
              if (!toast.read) {
                void markNotificationRead(toast.id);
                setUnreadCount((count) => Math.max(0, count - 1));
                setNotifications((current) =>
                  current.map((item) =>
                    item.id === toast.id ? { ...item, read: true } : item,
                  ),
                );
              }
            }}
          />
        ))}
        {appToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-[slideInUp_.35s_ease-out] overflow-hidden rounded-xl border shadow-[0_16px_48px_rgba(0,0,0,.35)] ${
              toast.variant === "error"
                ? "border-[#FECACA] bg-[#FFF5F6]"
                : "border-[#2A2A36] bg-white"
            }`}
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#101019] to-[#1A1320] px-3 py-2">
              <BrandMark size={20} />
              <span className="text-xs font-bold text-white">Team Tasks</span>
            </div>
            <div className="flex items-start gap-3 px-3 py-3">
              <p
                className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${
                  toast.variant === "error" ? "text-[#E11D2A]" : "text-[#14141A]"
                }`}
              >
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() =>
                  setAppToasts((current) => current.filter((item) => item.id !== toast.id))
                }
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#9495A3] transition hover:bg-[#F4F5FA] hover:text-[#14141A]"
                aria-label="Close message"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const {
    unreadCount,
    panelOpen,
    notifications,
    panelLoading,
    togglePanel,
    closePanel,
    openNotification,
    markAllRead,
  } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen, closePanel]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={panelOpen}
        aria-haspopup="true"
        className={`relative grid h-10 w-10 place-items-center rounded-xl border transition ${
          panelOpen
            ? "border-[#E11D2A] bg-[#FFF5F6] text-[#E11D2A]"
            : "border-[#E4E6EF] text-[#6B6C7A] hover:bg-[#F4F5FA] hover:text-[#14141A]"
        }`}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#E11D2A] px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[90] w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl border border-[#E4E6EF] bg-white shadow-[0_16px_48px_rgba(20,20,40,.18)]">
          <div className="flex items-center justify-between border-b border-[#E4E6EF] px-4 py-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#14141A]">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] font-semibold text-[#9495A3]">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] font-bold text-[#E11D2A] transition hover:text-[#C01824]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {panelLoading ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-[#9495A3]">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#9495A3]">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#EEF1F6]">
                {notifications.map((item) => {
                  const Icon = notificationIcon(item.message);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(item)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[#FAFBFD] ${
                          !item.read ? "bg-[#FFF8F9]" : ""
                        }`}
                      >
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                            !item.read
                              ? "bg-gradient-to-br from-[#FF5A72] to-[#E11D2A] text-white"
                              : "bg-[#F4F5FA] text-[#6B6C7A]"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug ${
                              !item.read
                                ? "font-bold text-[#14141A]"
                                : "font-semibold text-[#6B6C7A]"
                            }`}
                          >
                            {item.message}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-[#9495A3]">
                            {formatNotificationTime(item.created_at)}
                          </p>
                        </div>
                        {!item.read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E11D2A]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
