"use client";

import type { GenerationJobState } from "@/hooks/useGenerationSocket";

type Props = {
  job: GenerationJobState;
  locale: "es" | "en";
};

function isRasterUrl(url: string): boolean {
  return /\.(avif|bmp|gif|jpe?g|png|webp)(\?|$)/i.test(url) || /image\.pollinations\.ai/i.test(url);
}

export function GenerationProgress({ job, locale }: Props) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);
  const raster = job.outputUrl ? isRasterUrl(job.outputUrl) : false;

  return (
    <div className="elevation-card mt-4 space-y-3 p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-[#E7EFE9]">
          {job.status === "completed"
            ? t(raster ? "Imagen lista" : "Video listo", raster ? "Image ready" : "Video ready")
            : job.status === "failed"
              ? t("Generación fallida", "Generation failed")
              : t("Generando…", "Generating…")}
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
          {raster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.outputUrl}
              alt={t("Resultado generado", "Generated result")}
              className="max-h-72 w-full rounded-[8px] object-contain bg-[#0C1712]"
              loading="lazy"
            />
          ) : (
            <video
              src={job.outputUrl}
              controls
              className="max-h-64 w-full rounded-[8px] object-contain"
              playsInline
            />
          )}
          {job.costCents != null && job.costCents > 0 ? (
            <p className="text-xs text-[#C7CDD1]">
              {t("Costo registrado", "Recorded cost")}: ${(job.costCents / 100).toFixed(2)}
            </p>
          ) : (
            <p className="text-xs text-[#2FA84F]">
              {t("Modo gratis — sin cargo marginal", "Free mode — zero marginal cost")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
