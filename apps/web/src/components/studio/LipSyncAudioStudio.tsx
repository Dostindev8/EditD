"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface LipSyncAudioStudioProps {
  workspaceId: string;
  projectId: string;
  onJobStarted: (job: any) => void;
  locale: "es" | "en";
}

export function LipSyncAudioStudio({
  workspaceId,
  projectId,
  onJobStarted,
  locale,
}: LipSyncAudioStudioProps) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const [activeTab, setActiveTab] = useState<"lipsync" | "music" | "sfx">("lipsync");

  // LipSync states
  const [avatarUrl, setAvatarUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [speechScript, setSpeechScript] = useState("");
  const [voiceActor, setVoiceActor] = useState("latam-natural-male");

  // Music & SFX states
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicGenre, setMusicGenre] = useState("cinematic-trailer");
  const [musicDurationSec, setMusicDurationSec] = useState(30);

  const [generating, setGenerating] = useState(false);

  const handleGenerateLipSync = async () => {
    if (!avatarUrl.trim() || (!audioUrl.trim() && !speechScript.trim())) return;
    setGenerating(true);
    try {
      const res = await api<{ job: any }>(
        `/api/workspaces/${workspaceId}/projects/${projectId}/generation/direct`,
        {
          method: "POST",
          body: JSON.stringify({
            payload: {
              modality: "lipsync",
              modelId: "live-portrait-lipsync",
              prompt: speechScript || "High fidelity expressive lip synchronization",
              sourceImageUrl: avatarUrl,
              sourceAudioUrl: audioUrl || undefined,
              durationSec: 15,
              aspectRatio: "1:1",
            },
            locale,
          }),
        },
      );
      if (res?.job) onJobStarted(res.job);
    } catch (err: any) {
      alert(err.message || "Error al generar LipSync");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!musicPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await api<{ job: any }>(
        `/api/workspaces/${workspaceId}/projects/${projectId}/generation/direct`,
        {
          method: "POST",
          body: JSON.stringify({
            payload: {
              modality: "audio",
              modelId: "musicgen-audioldm",
              prompt: `${musicPrompt}, genre: ${musicGenre}, high quality audio master`,
              durationSec: musicDurationSec,
              aspectRatio: "16:9",
            },
            locale,
          }),
        },
      );
      if (res?.job) onJobStarted(res.job);
    } catch (err: any) {
      alert(err.message || "Error al generar audio");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2FA84F]/20 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-wide text-[#E7EFE9]">
            {t("LipSync & Audio Studio", "LipSync & Audio Studio")}
          </h2>
          <p className="mt-1 text-xs text-[#C7CDD1]/80">
            {t(
              "Sincronización labial hiperrealista de avatares y generación de bandas sonoras y efectos de sonido con IA.",
              "Hyperrealistic avatar lip-sync and AI soundtrack & sound effects generation.",
            )}
          </p>
        </div>

        <div className="flex rounded-[12px] bg-[#0C1712] p-1 border border-[#13251C]">
          <button
            type="button"
            onClick={() => setActiveTab("lipsync")}
            className={`rounded-[9px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === "lipsync"
                ? "bg-[#2FA84F] text-[#0C1712] shadow-sm shadow-[#2FA84F]/30"
                : "text-[#C7CDD1]/70 hover:text-[#E7EFE9]"
            }`}
          >
            {t("Avatar LipSync", "Avatar LipSync")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("music")}
            className={`rounded-[9px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === "music"
                ? "bg-[#2FA84F] text-[#0C1712] shadow-sm shadow-[#2FA84F]/30"
                : "text-[#C7CDD1]/70 hover:text-[#E7EFE9]"
            }`}
          >
            {t("Música & Soundtrack", "Music & Soundtrack")}
          </button>
        </div>
      </div>

      {activeTab === "lipsync" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                  {t("1. Imagen del Personaje / Avatar", "1. Character / Avatar Image")}
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://ejemplo.com/avatar.jpg"
                  className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] px-3.5 py-2.5 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                  {t("2. Audio de Voz o Guion Escrito (TTS)", "2. Voice Audio or Speech Script (TTS)")}
                </label>
                <textarea
                  value={speechScript}
                  onChange={(e) => setSpeechScript(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "Escribe aquí el texto que dirá el avatar con dicción perfecta...",
                    "Write the dialogue the avatar will speak with perfect diction...",
                  )}
                  className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-3 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none mb-2"
                />
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder={t("O pega la URL de un archivo de audio (.mp3, .wav)", "Or paste an audio file URL (.mp3, .wav)")}
                  className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] px-3.5 py-2.5 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                  {t("3. Voz y Tonalidad", "3. Voice & Tone")}
                </label>
                <select
                  value={voiceActor}
                  onChange={(e) => setVoiceActor(e.target.value)}
                  className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-2.5 text-xs text-[#E7EFE9]"
                >
                  <option value="latam-natural-male">Voz Masculina · Español Neutro (Cálido y Dinámico)</option>
                  <option value="latam-natural-female">Voz Femenina · Español Neutro (Elegante y Claro)</option>
                  <option value="cinema-narrator">Narrador Épico de Cine (Profundo y Resonante)</option>
                  <option value="corporate-professional">Locutor Corporativo / Comercial</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateLipSync}
                disabled={generating || !avatarUrl.trim()}
                className="w-full rounded-[12px] bg-[#2FA84F] py-3.5 text-sm font-semibold tracking-wide text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-lg shadow-[#2FA84F]/20 disabled:opacity-50"
              >
                {generating ? t("Generando LipSync Expresivo...", "Generating Expressive LipSync...") : t("Sincronizar Avatar con Voz", "Synchronize Avatar with Voice")}
              </button>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md min-h-[360px] flex flex-col items-center justify-center text-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar Preview"
                  className="h-44 w-44 rounded-full object-cover border-2 border-[#2FA84F] shadow-xl mb-3"
                />
              ) : (
                <div className="h-32 w-32 rounded-full border-2 border-dashed border-[#13251C] flex items-center justify-center text-3xl mb-3">
                  👤
                </div>
              )}
              <p className="text-xs text-[#C7CDD1]/80 max-w-xs">
                {t(
                  "El modelo LivePortrait preserva parpadeos naturales, expresiones faciales y sincronización labial exacta.",
                  "The LivePortrait engine preserves natural blinks, facial expressions, and exact lip sync.",
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Music Tab */
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                  {t("Descripción de la Música / Efecto Sonoro", "Music / Sound Effect Description")}
                </label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "Banda sonora orquestal épica con sintetizadores analógicos retro, percusión cinematográfica potente...",
                    "Epic orchestral soundtrack with retro analog synths, heavy cinematic percussion...",
                  )}
                  className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-3 text-xs text-[#E7EFE9] placeholder-[#C7CDD1]/40 focus:border-[#2FA84F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                    {t("Género / Mood", "Genre / Mood")}
                  </label>
                  <select
                    value={musicGenre}
                    onChange={(e) => setMusicGenre(e.target.value)}
                    className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-2.5 text-xs text-[#E7EFE9]"
                  >
                    <option value="cinematic-trailer">Cinematic Hollywood Trailer</option>
                    <option value="synthwave-80s">Cyberpunk Synthwave 80s</option>
                    <option value="lofi-chill">Lo-Fi Chill & Hip-Hop</option>
                    <option value="corporate-ambient">Corporate Tech Ambient</option>
                    <option value="epic-orchestral">Epic Hans Zimmer Style Orchestral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#2FA84F] mb-1.5">
                    {t("Duración", "Duration")} ({musicDurationSec}s)
                  </label>
                  <select
                    value={musicDurationSec}
                    onChange={(e) => setMusicDurationSec(Number(e.target.value))}
                    className="w-full rounded-[10px] border border-[#13251C] bg-[#0C1712] p-2.5 text-xs text-[#E7EFE9]"
                  >
                    <option value={15}>15 segundos (Spot)</option>
                    <option value={30}>30 segundos (Reel/Short)</option>
                    <option value={60}>60 segundos (Banda Completa)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={generating || !musicPrompt.trim()}
                className="w-full rounded-[12px] bg-[#2FA84F] py-3.5 text-sm font-semibold tracking-wide text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-lg shadow-[#2FA84F]/20 disabled:opacity-50"
              >
                {generating ? t("Componiendo Soundtrack...", "Composing Soundtrack...") : t("🎵 Componer Música con IA", "🎵 Compose Music with AI")}
              </button>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md min-h-[360px] flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full bg-[#13251C] flex items-center justify-center text-3xl mb-3 text-[#2FA84F]">
                🎧
              </div>
              <p className="text-sm font-semibold text-[#E7EFE9]">{t("AudioCraft & MusicGen Studio", "AudioCraft & MusicGen Studio")}</p>
              <p className="text-xs text-[#C7CDD1]/70 max-w-xs mt-1">
                {t(
                  "Genera piezas musicales 100% libres de derechos de autor para tus producciones y anuncios.",
                  "Generate 100% royalty-free musical pieces for your productions and ads.",
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
