export const ROLES = [
  "Manager",
  "Team Lead",
  "Developer",
  "Designer",
  "SEO",
] as const;

export type UserRole = (typeof ROLES)[number];

export const ASSIGN_ROLES: UserRole[] = ["Manager", "Team Lead"];

export const STATUSES = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Under Review",
  "Done",
] as const;

export type TaskStatus = (typeof STATUSES)[number];

export const MEMBER_STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
];

export const MINE_PIPELINE_STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Under Review",
  "Done",
];

export const WORKFLOW_STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Under Review",
  "Done",
];

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type TaskPriority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<
  TaskPriority,
  { color: string; dot: string }
> = {
  High: { color: "#E11D2A", dot: "#E11D2A" },
  Medium: { color: "#D97706", dot: "#F59E0B" },
  Low: { color: "#64748B", dot: "#94A3B8" },
};

export const CATEGORIES = ["Development", "Design", "SEO", "Other"] as const;
export type TaskCategory = (typeof CATEGORIES)[number];

export const STATUS_META: Record<
  TaskStatus,
  { color: string; bg: string; grad: string }
> = {
  "Not Started": {
    color: "#64748B",
    bg: "#EEF1F6",
    grad: "linear-gradient(135deg,#94A3B8,#64748B)",
  },
  "In Progress": {
    color: "#2563EB",
    bg: "#E6EEFF",
    grad: "linear-gradient(135deg,#3B82F6,#2563EB)",
  },
  Blocked: {
    color: "#E11D2A",
    bg: "#FDE7EA",
    grad: "linear-gradient(135deg,#FF5A72,#E11D2A)",
  },
  "Under Review": {
    color: "#D97706",
    bg: "#FEF1DD",
    grad: "linear-gradient(135deg,#FBBF24,#D97706)",
  },
  Done: {
    color: "#059669",
    bg: "#DCF7EC",
    grad: "linear-gradient(135deg,#34D399,#059669)",
  },
};

export const ROLE_META: Record<
  UserRole,
  { color: string; grad: string }
> = {
  Manager: { color: "#E11D2A", grad: "linear-gradient(135deg,#FF5A72,#E11D2A)" },
  "Team Lead": {
    color: "#F59E0B",
    grad: "linear-gradient(135deg,#FBBF24,#F59E0B)",
  },
  Developer: {
    color: "#6366F1",
    grad: "linear-gradient(135deg,#818CF8,#6366F1)",
  },
  Designer: {
    color: "#EC4899",
    grad: "linear-gradient(135deg,#F472B6,#EC4899)",
  },
  SEO: {
    color: "#10B981",
    grad: "linear-gradient(135deg,#34D399,#10B981)",
  },
};

export const COLORS = {
  red: "#E11D2A",
  text: "#14141A",
  muted: "#6B6C7A",
  sub: "#9495A3",
  line: "#E4E6EF",
  card: "#FFFFFF",
  violet: "#7C3AED",
};

export const VIEW_SUBTITLES: Record<string, string> = {
  dash: "Team summary at a glance",
  team: "Who is engaged with what, right now",
  board: "Workflow by status, everyone's tasks",
  all: "Every task, filterable",
  mine: "Your assigned work",
  settings: "Account and team configuration",
};
