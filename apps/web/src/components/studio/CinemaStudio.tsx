"use client";

import { useState } from "react";
import type { CameraMotionConfig, AspectRatio } from "@lcs/shared";
import { api } from "@/lib/api";

interface CinemaStudioProps {
  workspaceId: string;
  projectId: string;
  onJobStarted: (job: any) => void;
  locale: "es" | "en";
}

const CAMERA_MOTIONS: Array<{
  id: CameraMotionConfig["type"];
  name: string;
  desc: string;
  icon: string;
}> = [
  { id: "static", name: "Estático (Trípode)", desc: "Encuadre fijo estable", icon: "📷" },
  { id: "pan_left", name: "Panorámica Izq", desc: "Movimiento horizontal a la izquierda", icon: "⬅️" },
  { id: "pan_right", name: "Panorámica Der", desc: "Movimiento horizontal a la derecha", icon: "➡️" },
  { id: "tilt_up", name: "Tilt Arriba", desc: "Inclinación vertical hacia el cielo", icon: "⬆️" },
  { id: "tilt_down", name: "Tilt Abajo", desc: "Inclinación vertical hacia el suelo", icon: "⬇️" },
  { id: "zoom_in", name: "Zoom In (Óptico)", desc: "Acercamiento dinámico al sujeto", icon: "🔍" },
  { id: "zoom_out", name: "Zoom Out", desc: "Alejamiento para revelar el entorno", icon: "🔎" },
  { id: "dolly_in", name: "Dolly In (Steadicam)", desc: "Avance suave de cámara en riel", icon: "🎥" },
  { id: "orbit_left", name: "Órbita Circular", desc: "Giro de 360° alrededor del personaje", icon: "🔄" },
  { id: "crane_up", name: "Grúa / Pluma", desc: "Elevación dramática vertical", icon: "🏗️" },
  { id: "fpv_drone", name: "Drone FPV Cinema", desc: "Vuelo cinemático de alta velocidad", icon: "🚁" },
];

const LIGHTING_PRESETS: Array<{ id: NonNullable<CameraMotionConfig["lightingStyle"]>; name: string; desc: string }> = [
  { id: "golden_hour", name: "Golden Hour (Atardecer)", desc: "Tonos dorados cálidos con destellos suaves" },
  { id: "cyberpunk_neon", name: "Cyberpunk Neón", desc: "Reflejos holográficos azul cian y magenta" },
  { id: "volumetric_fog", name: "Niebla Volumétrica", desc: "Rayos de luz atravesando la bruma y el polvo" },
  { id: "studio_softbox", name: "Softbox de Estudio", desc: "Iluminación difusa profesional y suave" },
  { id: "film_noir", name: "Cine Negro (Film Noir)", desc: "Contraste extremo claroscuro y sombras duras" },
  { id: "natural_daylight", name: "Luz Natural 5600K", desc: "Luz solar diurna neutra equilibrada" },
];

export function CinemaStudio({
  workspaceId,
  projectId,
  onJobStarted,
  locale,
}: CinemaStudioProps) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const [prompt, setPrompt] = useState("");
  const [motionType, setMotionType] = useState<CameraMotionConfig["type"]>("dolly_in");
  const [intensity, setIntensity] = useState<number>(6);
  const [focalLength, setFocalLength] = useState<8 | 14 | 24 | 35 | 50 | 85>(35);
  const [aperture, setAperture] = useState<"f/1.4" | "f/4" | "f/11">("f/1.4");
  const [lighting, setLighting] = useState<CameraMotionConfig["lightingStyle"]>("golden_hour");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [durationSec, setDurationSec] = useState(10);
  const [generating, setGenerating] = useState(false);

  const handleDirectShot = async () => {
    if (!prompt.trim() || !workspaceId || !projectId) return;
    setGenerating(true);
    try {
      const cameraMotion: CameraMotionConfig = {
        type: motionType,
        intensity,
        focalLengthMm: focalLength,
        aperture,
        lightingStyle: lighting,
      };

      const res = await api<{ job: any }>(
        `/api/workspaces/${workspaceId}/projects/${projectId}/generation/direct`,
        {
          method: "POST",
          body: JSON.stringify({
            payload: {
              modality: "cinema",
              modelId: "minimax-hailuo",
              prompt,
              aspectRatio,
              durationSec,
              cameraMotion,
              quality: "4k",
            },
            locale,
          }),
        },
      );

      if (res?.job) {
        onJobStarted(res.job);
      }
    } catch (err: any) {
      alert(err.message || "Error al dirigir la toma de cine");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2FA84F]/20 pb-4">
        <h2 className="text-xl font-semibold tracking-wide text-[#E7EFE9]">
          {t("Cinema Studio · Dirección de Cámaras & Óptica", "Cinema Studio · Camera & Optics Director")}
        </h2>
        <p className="mt-1 text-xs text-[#C7CDD1]/80">
          {t(
            "Control milimétrico de movimientos de cámara cinematográficos, distancia focal y estilos de iluminación.",
            "Millimetric control over cinematic camera motions, focal lengths, and lighting styles.",
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Directing Controls */}
        <div className="space-y-5 lg:col-span-8">
          {/* Prompt */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
              {t("Guion de la Escena / Sujeto", "Scene Script / Subject")}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={t(
                "Un explorador solitario contemplando las ruinas de una ciudad flotante en la niebla...",
                "A solitary explorer looking over floating city ruins in the fog...",
              )}
              className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-3 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
            />
          </div>

          {/* Camera Motion Grid */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#2FA84F]">
                {t("Movimiento de Cámara (Camera Motion)", "Camera Motion")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#C7CDD1]/70">{t("Velocidad/Fuerza:", "Speed/Force:")}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="accent-[#2FA84F] h-1.5 w-24 bg-[#13251C] rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-[#2FA84F]">{intensity}/10</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {CAMERA_MOTIONS.map((motion) => {
                const isSelected = motionType === motion.id;
                return (
                  <button
                    key={motion.id}
                    type="button"
                    onClick={() => setMotionType(motion.id)}
                    className={`rounded-[12px] p-2.5 text-left border transition-all ${
                      isSelected
                        ? "border-[#2FA84F] bg-[#13251C] shadow-md shadow-[#2FA84F]/10"
                        : "border-[#13251C]/60 bg-[#0C1712] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{motion.icon}</span>
                      <span className="text-xs font-semibold text-[#E7EFE9] truncate">{motion.name}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#C7CDD1]/60 line-clamp-1">{motion.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optics: Focal Length & Aperture */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lenses */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
                  {t("Lente / Distancia Focal", "Lens / Focal Length")}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[8, 14, 24, 35, 50, 85].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => setFocalLength(mm as any)}
                      className={`rounded-[8px] py-1.5 text-center text-xs font-semibold border ${
                        focalLength === mm
                          ? "border-[#2FA84F] bg-[#2FA84F] text-[#0C1712]"
                          : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/40"
                      }`}
                    >
                      {mm}mm {mm <= 14 ? "(Ultra Wide)" : mm === 35 ? "(Cine Prime)" : mm >= 50 ? "(Portrait)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aperture */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
                  {t("Apertura (Profundidad de Campo)", "Aperture (Depth of Field)")}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["f/1.4", "f/4", "f/11"] as const).map((ap) => (
                    <button
                      key={ap}
                      type="button"
                      onClick={() => setAperture(ap)}
                      className={`rounded-[8px] py-1.5 text-center text-xs font-semibold border ${
                        aperture === ap
                          ? "border-[#2FA84F] bg-[#2FA84F] text-[#0C1712]"
                          : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/40"
                      }`}
                    >
                      {ap} {ap === "f/1.4" ? "(Bokeh)" : ap === "f/4" ? "(Equilibrado)" : "(Deep Focus)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lighting Preset */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
                {t("Estilo de Iluminación Cinemática", "Cinematic Lighting Style")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LIGHTING_PRESETS.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() => setLighting(lp.id)}
                    className={`rounded-[10px] p-2.5 text-left border ${
                      lighting === lp.id
                        ? "border-[#2FA84F] bg-[#13251C]"
                        : "border-[#13251C]/60 bg-[#0C1712] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[#E7EFE9]">{lp.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[#C7CDD1]/60 leading-tight">{lp.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Director Summary & Action */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2FA84F]">
              {t("Claqueta del Director", "Director's Slate")}
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#13251C]">
              <div className="flex justify-between pt-2">
                <span className="text-[#C7CDD1]/70">{t("Cámara / Sensor:", "Camera / Sensor:")}</span>
                <span className="font-semibold text-[#E7EFE9]">ARRI Alexa LF (Large Format)</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#C7CDD1]/70">{t("Movimiento:", "Motion:")}</span>
                <span className="font-semibold text-[#2FA84F]">{motionType.toUpperCase()} ({intensity}/10)</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#C7CDD1]/70">{t("Óptica:", "Optics:")}</span>
                <span className="font-semibold text-[#E7EFE9]">{focalLength}mm · {aperture}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#C7CDD1]/70">{t("Iluminación:", "Lighting:")}</span>
                <span className="font-semibold text-[#E7EFE9]">{lighting}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#C7CDD1]/70">{t("Formato Cine:", "Cinema Format:")}</span>
                <span className="font-semibold text-[#2FA84F]">{aspectRatio} (2.39:1 Anamorphic)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDirectShot}
                disabled={generating || !prompt.trim()}
                className="w-full rounded-[12px] bg-[#2FA84F] py-3.5 text-sm font-semibold tracking-wide text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-lg shadow-[#2FA84F]/20 disabled:opacity-50"
              >
                {generating ? t("Rodando Escena...", "Shooting Scene...") : t("🎬 Rodar Escena Cinemática", "🎬 Shoot Cinematic Scene")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
