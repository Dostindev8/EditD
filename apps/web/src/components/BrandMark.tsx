type Size = "sm" | "md" | "lg" | "hero";

const sizes: Record<Size, string> = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24 sm:h-28 sm:w-28",
  hero: "h-36 w-36 sm:h-44 sm:w-44",
};

export function BrandMark({
  size = "md",
  className = "",
  alt = "editD",
}: {
  size?: Size;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/brand/logo-d.png"
      alt={alt}
      width={866}
      height={866}
      className={`brand-mark object-contain ${sizes[size]} ${className}`}
      decoding="async"
    />
  );
}
