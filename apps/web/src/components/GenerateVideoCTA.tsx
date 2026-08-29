"use client";

import type { VideoOption } from "@/lib/api";

type Props = {
  option: VideoOption;
  estimatedCostCents: number;
  locale: "es" | "en";
  onGenerate: () => void;
  disabled?: boolean;
};

export function GenerateVideoCTA({ option, estimatedCostCents, locale, onGenerate, disabled }: Props) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  return (
    <div className="elevation-card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="brand-serif text-sm text-[#E7EFE9]">{option.title}</p>
        <p className="text-xs text-[#C7CDD1]">
          {option.aspectRatio} · {option.durationSec}s
          {estimatedCostCents === 0
            ? ` · ${t("demo sin API keys", "demo without API keys")}`
            : ` · ~$${(estimatedCostCents / 100).toFixed(2)} ${t("estimado", "est.")}`}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className="shrink-0 rounded-[8px] bg-[#2FA84F] px-4 py-2.5 text-sm font-medium text-[#0C1712] hover:bg-[#1E7A3E] hover:text-[#E7EFE9] disabled:opacity-40"
      >
        {t("Generar video →", "Generate video →")}
      </button>
    </div>
  );
}
