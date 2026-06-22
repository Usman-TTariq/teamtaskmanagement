import Image from "next/image";

export const BRAND_LOGO_PATH = "/tgtnexus_logo.jpg";

const SIZES = {
  sm: 28,
  md: 40,
  lg: 72,
} as const;

type Props = {
  size?: keyof typeof SIZES;
  showText?: boolean;
  layout?: "horizontal" | "vertical";
  tagline?: string;
  className?: string;
  textClassName?: string;
};

export function BrandLogo({
  size = "md",
  showText = true,
  layout = "horizontal",
  tagline = "Team Tasks",
  className = "",
  textClassName = "",
}: Props) {
  const px = SIZES[size];
  const isVertical = layout === "vertical";

  return (
    <div
      className={`flex ${isVertical ? "flex-col items-center text-center" : "items-center gap-2.5"} ${className}`}
    >
      <Image
        src={BRAND_LOGO_PATH}
        alt="TGT Nexus"
        width={px}
        height={px}
        className="shrink-0 rounded-lg object-cover"
        priority={size === "lg"}
      />
      {showText && (
        <div className={textClassName}>
          <div className="text-sm font-extrabold tracking-tight">TGT Nexus</div>
          {tagline && (
            <div className="text-[10px] font-semibold opacity-80">{tagline}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function BrandMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={BRAND_LOGO_PATH}
      alt="TGT Nexus"
      width={size}
      height={size}
      className={`shrink-0 rounded-md object-cover ${className}`}
    />
  );
}
