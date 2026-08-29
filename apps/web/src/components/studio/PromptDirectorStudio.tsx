"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface PromptDirectorStudioProps {
  onUsePrompt: (prompt: string, negativePrompt?: string) => void;
  locale: "es" | "en";
}

const STYLE_PRESETS = [
  { id: "cinematic-35mm", name: "Cinematográfico 35mm", tag: "35mm anamorphic photography, ARRI Alexa LF, cinematic color grade, volumetric dust" },
  { id: "cyberpunk", name: "Cyberpunk Hi-Tech", tag: "futuristic cyberpunk city, neon reflections, wet pavement, holograms, blade runner style" },
  { id: "hyperrealism", name: "Hiperrealismo 8K", tag: "8k RAW photo, Hasselblad H6D, ultra-sharp focus, natural subsurface scattering" },
  { id: "fantasy-rpg", name: "Fantasía Épica RPG", tag: "high fantasy epic matte painting, intricate magical runes, unreal engine 5, octane render" },
  { id: "anime-ghibli", name: "Anime Makoto Shinkai", tag: "makoto shinkai aesthetic, studio ghibli lighting, vibrant colors, lush detailed sky" },
  { id: "film-noir", name: "Cine Negro (Film Noir)", tag: "1940s vintage film noir, dramatic chiaroscuro lighting, deep shadows, rainy monochrome" },
];

const LIGHTING_TAGS = [
  "Golden Hour sunlight",
  "Volumetric god rays",
  "Moody cyberpunk neon",
  "Studio softbox diffusion",
  "Dusk blue hour ambient",
  "Bioluminescent glow",
];

const CAMERA_LENSES = [
  "Master Anamorphic 35mm",
  "Ultra-Wide 14mm Cine",
  "Portrait Prime 85mm f/1.4",
  "Extreme Macro 100mm",
  "70mm Grand Format Film",
];

export function PromptDirectorStudio({ onUsePrompt, locale }: PromptDirectorStudioProps) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const [baseSubject, setBaseSubject] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedLighting, setSelectedLighting] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string>("");

  const toggleTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
    if (list.includes(tag)) {
      setList(list.filter((x) => x !== tag));
    } else {
      setList([...list, tag]);
    }
  };

  const compiledPrompt = [
    baseSubject.trim(),
    ...selectedStyles,
    ...selectedLighting,
    selectedLens,
  ]
    .filter(Boolean)
    .join(", ");

  const negativePrompt =
    "blurry, low quality, distorted anatomy, extra limbs, bad hands, artifacts, watermark, logo, text, cropped";

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2FA84F]/20 pb-4">
        <h2 className="text-xl font-semibold tracking-wide text-[#E7EFE9]">
          {t("Prompt Director · Asistente de Guion Visual", "Prompt Director · Visual Script Assistant")}
        </h2>
        <p className="mt-1 text-xs text-[#C7CDD1]/80">
          {t(
            "Construye prompts profesionales combinando sujeto, estética, iluminación, lentes y estilo.",
            "Construct professional prompts by combining subject, aesthetics, lighting, lenses, and style.",
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form */}
        <div className="space-y-5 lg:col-span-7">
          {/* Base Subject */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
              {t("1. Sujeto / Acción Principal", "1. Main Subject / Action")}
            </label>
            <input
              type="text"
              value={baseSubject}
              onChange={(e) => setBaseSubject(e.target.value)}
              placeholder={t(
                "ej: Un jaguar negro con ojos esmeralda en una selva tropical lluviosa",
                "e.g. A black jaguar with emerald eyes in a rainy tropical jungle",
              )}
              className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-3 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
            />
          </div>

          {/* Style Presets */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2.5">
              {t("2. Estilo Visual & Motor de Render", "2. Visual Style & Render Engine")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLE_PRESETS.map((preset) => {
                const active = selectedStyles.includes(preset.tag);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => toggleTag(selectedStyles, setSelectedStyles, preset.tag)}
                    className={`rounded-[10px] p-2.5 text-left border text-xs font-medium transition-all ${
                      active
                        ? "border-[#2FA84F] bg-[#13251C] text-[#2FA84F]"
                        : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lighting Tags */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2.5">
              {t("3. Atmósfera & Iluminación", "3. Atmosphere & Lighting")}
            </label>
            <div className="flex flex-wrap gap-2">
              {LIGHTING_TAGS.map((tag) => {
                const active = selectedLighting.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(selectedLighting, setSelectedLighting, tag)}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-medium border transition-all ${
                      active
                        ? "border-[#2FA84F] bg-[#2FA84F] text-[#0C1712]"
                        : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lenses */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2.5">
              {t("4. Óptica Cinemática", "4. Cinematic Optics")}
            </label>
            <div className="flex flex-wrap gap-2">
              {CAMERA_LENSES.map((lens) => {
                const active = selectedLens === lens;
                return (
                  <button
                    key={lens}
                    type="button"
                    onClick={() => setSelectedLens(active ? "" : lens)}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-medium border transition-all ${
                      active
                        ? "border-[#2FA84F] bg-[#2FA84F] text-[#0C1712]"
                        : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    {lens}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Output */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2FA84F]">
              {t("Prompt Compilado Listo", "Compiled Prompt Ready")}
            </h3>

            <div className="rounded-[10px] bg-[#13251C] p-4 text-xs font-mono text-[#E7EFE9] leading-relaxed min-h-[140px] border border-[#13251C]">
              {compiledPrompt || (
                <span className="text-[#C7CDD1]/40">
                  {t("Escribe un sujeto y selecciona modificadores para ver el prompt final aquí...", "Enter a subject and select modifiers to see the final prompt here...")}
                </span>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#C7CDD1]/70 mb-1">
                {t("Prompt Negativo Automático:", "Auto Negative Prompt:")}
              </label>
              <div className="rounded-[8px] bg-[#0C1712] p-2.5 text-[11px] font-mono text-[#C7CDD1]/70 border border-[#13251C]">
                {negativePrompt}
              </div>
            </div>

            <button
              type="button"
              disabled={!compiledPrompt.trim()}
              onClick={() => onUsePrompt(compiledPrompt, negativePrompt)}
              className="w-full rounded-[12px] bg-[#2FA84F] py-3.5 text-sm font-semibold tracking-wide text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-lg shadow-[#2FA84F]/20 disabled:opacity-50"
            >
              {t("🚀 Enviar al Estudio Generativo", "🚀 Send to Generative Studio")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
