import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
};

export function EmptyState({ icon: Icon, title, description, compact }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DBE8] bg-white text-center ${
        compact ? "px-6 py-10" : "px-8 py-16"
      }`}
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F4F5FA]">
        <Icon size={24} className="text-[#9495A3]" strokeWidth={2} />
      </div>
      <h3 className="text-base font-extrabold text-[#14141A]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B6C7A]">
        {description}
      </p>
    </div>
  );
}
