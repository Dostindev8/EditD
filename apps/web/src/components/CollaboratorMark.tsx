type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "h-8 w-auto max-w-[4.5rem]",
  md: "h-10 w-auto max-w-[6rem]",
};

export function CollaboratorMark({
  size = "sm",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <img
      src="/brand/logo-lcs.png"
      alt=""
      width={1024}
      height={512}
      className={`brand-mark object-contain ${sizes[size]} ${className}`}
      decoding="async"
    />
  );
}

export function CollaboratorLockup({ size = "sm" }: { size?: Size }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#C7CDD1]/70">En colaboración con</p>
      <CollaboratorMark size={size} />
      <p className="text-[10px] tracking-[0.18em] text-[#C7CDD1]/80">Logic Code Spot</p>
    </div>
  );
}
