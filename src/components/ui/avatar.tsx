import type { UserRole } from "@/lib/constants";
import { ROLE_META } from "@/lib/constants";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type Props = {
  name: string;
  role?: UserRole | null;
  size?: number;
};

export function Avatar({ name, role, size = 36 }: Props) {
  const meta = role ? ROLE_META[role] : null;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          background: "linear-gradient(135deg,#26262F,#121218)",
          boxShadow: meta
            ? `0 0 0 2px #fff, 0 0 0 3px ${meta.color}`
            : undefined,
        }}
      >
        {initials(name)}
      </div>
    </div>
  );
}
