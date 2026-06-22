import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number | string;
  sub?: string;
  grad: string;
  glow: string;
  icon: LucideIcon;
  sharp?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

export function StatCard({
  label,
  value,
  sub,
  grad,
  glow,
  icon: Icon,
  sharp = false,
  selected = false,
  onClick,
}: Props) {
  const interactive = Boolean(onClick);

  if (sharp) {
    const className = [
      "w-full border bg-white p-4 text-left transition",
      selected
        ? "border-[#14141A] bg-[#FAFBFD] ring-1 ring-[#14141A]"
        : "border-[#E4E6EF] hover:border-[#14141A]/30 hover:bg-[#FAFBFD]",
      interactive ? "cursor-pointer" : "",
    ].join(" ");

    const content = (
      <>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div
            className="grid h-9 w-9 place-items-center"
            style={{ background: grad }}
          >
            <Icon size={17} color="#fff" strokeWidth={2.4} />
          </div>
          <div className="text-right text-[26px] font-extrabold leading-none text-[#14141A]">
            {value}
          </div>
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#14141A]">
          {label}
        </div>
        {sub && (
          <div className="mt-1 text-[11px] font-medium text-[#9495A3]">{sub}</div>
        )}
      </>
    );

    if (interactive) {
      return (
        <button type="button" onClick={onClick} className={className}>
          {content}
        </button>
      );
    }

    return <div className={className}>{content}</div>;
  }

  return (
    <div className="rounded-2xl border border-[#E4E6EF] bg-white p-4 shadow-[0_1px_2px_rgba(20,20,40,.04)]">
      <div
        className="mb-3 grid h-10 w-10 place-items-center rounded-xl"
        style={{ background: grad, boxShadow: `0 8px 18px ${glow}` }}
      >
        <Icon size={18} color="#fff" strokeWidth={2.4} />
      </div>
      <div className="text-[28px] font-extrabold leading-none text-[#14141A]">
        {value}
      </div>
      <div className="mt-1.5 text-xs font-bold text-[#6B6C7A]">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[#9495A3]">{sub}</div>}
    </div>
  );
}
