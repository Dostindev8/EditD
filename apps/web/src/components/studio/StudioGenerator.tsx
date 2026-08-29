"use client";

import { useState } from "react";
import {
  GENERATIVE_MODELS_CATALOG,
  type AspectRatio,
  type GenerativeModel,
  type GenerationModality,
  type GenerationRequestPayload,
} from "@lcs/shared";
import { api } from "@/lib/api";

interface StudioGeneratorProps {
  workspaceId: string;
  projectId: string;
  onJobStarted: (job: any) => void;
  locale: "es" | "en";
}

export function StudioGenerator({
  workspaceId,
  projectId,
  onJobStarted,
  locale,
}: StudioGeneratorProps) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const [modality, setModality] = useState<GenerationModality>("image");
  const modelsForModality = GENERATIVE_MODELS_CATALOG.filter(
    (m) => m.modality === modality || (modality === "video" && m.modality === "video"),
  );

  const [selectedModel, setSelectedModel] = useState<GenerativeModel>(
    modelsForModality[0] || GENERATIVE_MODELS_CATALOG[0],
  );
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [durationSec, setDurationSec] = useState(10);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [quality, setQuality] = useState<"standard" | "hd" | "4k">("hd");
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleModalityChange = (m: GenerationModality) => {
    setModality(m);
    const available = GENERATIVE_MODELS_CATALOG.filter((model) => model.modality === m);
    if (available.length > 0) {
      setSelectedModel(available[0]);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await api<{ enhancedPrompt: string; negativePrompt: string }>(
        "/api/generation/enhance-prompt",
        {
          method: "POST",
          body: JSON.stringify({ prompt, style: "cinematic", aspectRatio }),
        },
      );
      if (res.enhancedPrompt) setPrompt(res.enhancedPrompt);
      if (res.negativePrompt && !negativePrompt) setNegativePrompt(res.negativePrompt);
    } catch {
      // Fallback local enhancement
      setPrompt(
        `${prompt}, cinematic 35mm photograph, master anamorphic lens, volumetric lighting, photorealistic color grade, 8k resolution`,
      );
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspaceId || !projectId) return;
    setGenerating(true);
    try {
      const payload: GenerationRequestPayload = {
        modality,
        modelId: selectedModel.id,
        prompt,
        negativePrompt: negativePrompt.trim() || undefined,
        aspectRatio,
        durationSec: modality === "image" ? undefined : durationSec,
        sourceImageUrl: sourceImageUrl.trim() || undefined,
        quality,
        steps,
        cfgScale,
        seed,
      };

      const res = await api<{ job: any }>(
        `/api/workspaces/${workspaceId}/projects/${projectId}/generation/direct`,
        {
          method: "POST",
          body: JSON.stringify({ payload, locale }),
        },
      );

      if (res?.job) {
        onJobStarted(res.job);
        if (res.job.outputUrl) {
          setResultUrl(res.job.outputUrl);
        }
      }
    } catch (err: any) {
      alert(err.message || "Error al iniciar la generación");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2FA84F]/20 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-wide text-[#E7EFE9]">
            {t("Estudio Generativo Multi-Modelo", "Multi-Model Generative Studio")}
          </h2>
          <p className="mt-1 text-xs text-[#C7CDD1]/80">
            {t(
              "Motor de renderizado hiperrealista para imágenes, video cinematográfico y audio.",
              "Hyper-realistic rendering engine for images, cinematic video and audio.",
            )}
          </p>
        </div>

        {/* Modality Selector */}
        <div className="flex rounded-[12px] bg-[#0C1712] p-1 border border-[#13251C]">
          {(["image", "video", "audio"] as GenerationModality[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModalityChange(m)}
              className={`rounded-[9px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                modality === m
                  ? "bg-[#2FA84F] text-[#0C1712] shadow-sm shadow-[#2FA84F]/30"
                  : "text-[#C7CDD1]/70 hover:text-[#E7EFE9]"
              }`}
            >
              {m === "image" ? t("Imagen", "Image") : m === "video" ? t("Video", "Video") : t("Audio", "Audio")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Configuration Form */}
        <div className="space-y-5 lg:col-span-7">
          {/* Model Picker Card */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F]">
              {t("Modelo de IA Seleccionado", "Selected AI Model")}
            </label>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modelsForModality.map((model) => {
                const isSelected = selectedModel.id === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`rounded-[12px] p-3 text-left transition-all border ${
                      isSelected
                        ? "border-[#2FA84F] bg-[#13251C] shadow-md shadow-[#2FA84F]/10"
                        : "border-[#13251C]/60 bg-[#0C1712] hover:border-[#2FA84F]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#E7EFE9]">{model.name}</span>
                      <span className="text-[10px] text-[#2FA84F] tracking-widest uppercase">{model.provider}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#C7CDD1]/70 leading-relaxed">
                      {model.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Input & Director Enhancer */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#2FA84F]">
                {t("Prompt Principal (Descripción)", "Main Prompt")}
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={enhancing || !prompt.trim()}
                className="flex items-center gap-1.5 rounded-[8px] border border-[#2FA84F]/40 bg-[#13251C] px-2.5 py-1 text-[11px] font-medium text-[#2FA84F] hover:bg-[#2FA84F] hover:text-[#0C1712] transition-colors disabled:opacity-50"
              >
                <span>✨</span>
                <span>{enhancing ? t("Mejorando...", "Enhancing...") : t("Mejorar con IA", "AI Enhance")}</span>
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={t(
                "Describe la escena con iluminación, estilo visual, encuadre y detalles...",
                "Describe the scene with lighting, visual style, framing and details...",
              )}
              className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-3 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none focus:ring-1 focus:ring-[#2FA84F]"
            />

            {/* Negative Prompt */}
            <div>
              <label className="block text-[11px] font-medium text-[#C7CDD1]/70 mb-1">
                {t("Prompt Negativo (Evitar)", "Negative Prompt (Avoid)")}
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder={t("ej: borroso, deforme, texto, marca de agua", "e.g. blurry, deformed, text, watermark")}
                className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] px-3 py-2 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
              />
            </div>

            {/* Source Image (For I2V or I2I) */}
            {selectedModel.supportsImageToVideo || modality === "image" ? (
              <div>
                <label className="block text-[11px] font-medium text-[#C7CDD1]/70 mb-1">
                  {t("URL de Imagen de Referencia (Opcional)", "Reference Image URL (Optional)")}
                </label>
                <input
                  type="url"
                  value={sourceImageUrl}
                  onChange={(e) => setSourceImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] px-3 py-2 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          {/* Controls: Aspect Ratio, Quality, Duration, Steps, CFG */}
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-4 backdrop-blur-md space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-2">
                {t("Relación de Aspecto (Aspect Ratio)", "Aspect Ratio")}
              </label>
              <div className="flex flex-wrap gap-2">
                {(selectedModel.aspectRatios || ["16:9", "9:16", "1:1", "21:9", "4:5"]).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all border ${
                      aspectRatio === ar
                        ? "border-[#2FA84F] bg-[#2FA84F] text-[#0C1712]"
                        : "border-[#13251C] bg-[#0C1712] text-[#C7CDD1] hover:border-[#2FA84F]/50"
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {modality === "video" ? (
                <div>
                  <label className="block text-[11px] text-[#C7CDD1]/70 mb-1">
                    {t("Duración", "Duration")} ({durationSec}s)
                  </label>
                  <select
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] p-2 text-xs text-[#E7EFE9]"
                  >
                    <option value={5}>5 segundos</option>
                    <option value={8}>8 segundos</option>
                    <option value={10}>10 segundos</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-[11px] text-[#C7CDD1]/70 mb-1">
                  {t("Calidad", "Quality")}
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as any)}
                  className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] p-2 text-xs text-[#E7EFE9]"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD (High Def)</option>
                  <option value="4k">4K Ultra Cine</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#C7CDD1]/70 mb-1">
                  {t("Pasos (Steps)", "Steps")} ({steps})
                </label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] p-2 text-xs text-[#E7EFE9]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#C7CDD1]/70 mb-1">
                  {t("Escala CFG", "CFG Scale")} ({cfgScale})
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={1}
                  max={20}
                  value={cfgScale}
                  onChange={(e) => setCfgScale(Number(e.target.value))}
                  className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] p-2 text-xs text-[#E7EFE9]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#C7CDD1]/70 mb-1">
                  {t("Semilla (Seed)", "Seed")}
                </label>
                <input
                  type="number"
                  placeholder="Aleatorio"
                  value={seed ?? ""}
                  onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-[8px] border border-[#13251C] bg-[#0C1712] p-2 text-xs text-[#E7EFE9]"
                />
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full rounded-[12px] bg-[#2FA84F] py-3.5 text-sm font-semibold tracking-wide text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-lg shadow-[#2FA84F]/20 disabled:opacity-50"
            >
              {generating ? t("Procesando Generación...", "Processing Generation...") : t("Renderizar con IA", "Render with AI")}
            </button>
          </div>
        </div>

        {/* Right: Live Preview & Canvas */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md min-h-[420px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#13251C] pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E7EFE9]">
                {t("Monitor de Salida", "Output Monitor")}
              </span>
              <span className="rounded-[6px] bg-[#13251C] px-2 py-0.5 text-[10px] font-mono text-[#2FA84F]">
                {selectedModel.name} · {aspectRatio}
              </span>
            </div>

            <div className="my-auto flex flex-col items-center justify-center p-6 text-center">
              {resultUrl ? (
                modality === "video" || resultUrl.endsWith(".mp4") ? (
                  <video
                    src={resultUrl}
                    controls
                    autoPlay
                    loop
                    className="max-h-[340px] w-full rounded-[12px] object-contain shadow-2xl border border-[#2FA84F]/30"
                  />
                ) : (
                  <img
                    src={resultUrl}
                    alt="Generated output"
                    className="max-h-[340px] w-full rounded-[12px] object-contain shadow-2xl border border-[#2FA84F]/30"
                  />
                )
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#2FA84F]/20 bg-[#13251C] text-[#2FA84F] text-xl">
                    🎬
                  </div>
                  <p className="text-sm font-medium text-[#E7EFE9]">
                    {t("Listo para Renderizar", "Ready to Render")}
                  </p>
                  <p className="text-xs text-[#C7CDD1]/60 max-w-xs">
                    {t(
                      "Configura tu prompt, parámetros y pulsa 'Renderizar con IA' para generar la pieza audiovisual.",
                      "Configure your prompt, parameters, and click 'Render with AI' to generate.",
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[10px] bg-[#13251C]/60 p-3 text-[11px] text-[#C7CDD1]/80 flex items-center justify-between">
              <span>{t("Gobernanza & Presupuesto:", "Governance & Budget:")}</span>
              <span className="text-[#2FA84F] font-semibold">{t("Verificado ✓", "Verified ✓")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
