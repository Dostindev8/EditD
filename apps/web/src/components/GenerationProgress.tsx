"use client";

import type { GenerationJobState } from "@/hooks/useGenerationSocket";

type Props = {
  job: GenerationJobState;
  locale: "es" | "en";
};

export function GenerationProgress({ job, locale }: Props) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  return (
    <div className="elevation-card mt-4 space-y-3 p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-[#E7EFE9]">
          {job.status === "completed"
            ? t("Video listo", "Video ready")
            : job.status === "failed"
              ? t("Generación fallida", "Generation failed")
              : t("Generando video…", "Generating video…")}
        </span>
        <span className="text-xs text-[#C7CDD1]">
          {job.provider ?? "—"} · {job.progress}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#0C1712]">
        <div
          className={`h-full transition-all duration-500 ${
            job.status === "failed" ? "bg-red-500/80" : "bg-[#2FA84F]"
          }`}
          style={{ width: `${Math.min(100, job.progress)}%` }}
        />
      </div>

      {job.status === "failed" && job.error ? (
        <p className="text-xs text-red-300/90">{job.error}</p>
      ) : null}

      {job.status === "completed" && job.outputUrl ? (
        <div className="space-y-2">
          <video
            src={job.outputUrl}
            controls
            className="max-h-64 w-full rounded-[8px] object-contain"
            playsInline
          />
          {job.costCents != null && job.costCents > 0 ? (
            <p className="text-xs text-[#C7CDD1]">
              {t("Costo registrado", "Recorded cost")}: ${(job.costCents / 100).toFixed(2)}
            </p>
          ) : (
            <p className="text-xs text-[#2FA84F]">{t("Modo demo — sin cargo", "Demo mode — no charge")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
