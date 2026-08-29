"use client";

import type { VideoOption } from "@/lib/api";

type Props = {
  options: VideoOption[];
  locale: "es" | "en";
  onSelect: (option: VideoOption) => void;
  disabled?: boolean;
  selectedId?: string;
};

export function VideoOptionsPanel({ options, locale, onSelect, disabled, selectedId }: Props) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((o) => {
        const isSelected = selectedId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(o)}
            className={`group elevation-card flex flex-col gap-2 p-4 text-left transition disabled:opacity-50 ${
              isSelected
                ? "ring-2 ring-[#2FA84F] bg-[#13251C]"
                : "hover:ring-1 hover:ring-[#2FA84F]/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="brand-serif text-sm text-[#E7EFE9]">{o.title}</span>
              <span className="shrink-0 rounded-[8px] bg-[#0C1712] px-2 py-0.5 text-xs text-[#C7CDD1]">
                {o.aspectRatio}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#E7EFE9]/75">{o.description}</p>
            <div className="mt-auto space-y-1 pt-2 text-[11px] text-[#C7CDD1]">
              <p>
                {t("Duración", "Duration")}: {o.durationSec}s · {o.platform}
              </p>
              <p>
                {t("Cámara", "Camera")}: {o.cameraMovement}
              </p>
              <p className="text-[#2FA84F]">
                {o.estimatedCostCents === 0
                  ? t("Gratis — explorar opción", "Free — explore option")
                  : `$${(o.estimatedCostCents / 100).toFixed(2)}`}
              </p>
            </div>
            <span className="mt-1 text-xs font-medium text-[#2FA84F] group-hover:underline">
              {t("Elegir esta dirección →", "Choose this direction →")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
