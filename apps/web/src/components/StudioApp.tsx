"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  api,
  assetUrl,
  type Asset,
  type ChatMsg,
  type Project,
  type User,
  type VideoOption,
  type Workspace,
} from "@/lib/api";
import { CreatorUpload } from "@/components/CreatorUpload";
import { BrandMark } from "@/components/BrandMark";
import { CollaboratorMark } from "@/components/CollaboratorMark";
import { VideoOptionsPanel } from "@/components/VideoOptionsPanel";
import { GenerateVideoCTA } from "@/components/GenerateVideoCTA";
import { GenerationProgress } from "@/components/GenerationProgress";
import { useGenerationSocket } from "@/hooks/useGenerationSocket";
import { StudioGenerator } from "@/components/studio/StudioGenerator";
import { CinemaStudio } from "@/components/studio/CinemaStudio";
import { LipSyncAudioStudio } from "@/components/studio/LipSyncAudioStudio";
import { VisualWorkflowStudio } from "@/components/studio/VisualWorkflowStudio";
import { PromptDirectorStudio } from "@/components/studio/PromptDirectorStudio";

const VideoEditorChunk = dynamic(() => import("@/modules/video-editor/placeholder"), {
  ssr: false,
  loading: () => <div className="shimmer h-24 rounded-[16px]" />,
});

type StudioTab = "chat" | "generator" | "cinema" | "lipsync" | "workflow" | "prompts" | "video";

function renderMarkdownLite(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-[#E7EFE9]">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        )}
        {i < text.split("\n").length - 1 ? <br /> : null}
      </span>
    );
  });
}

export default function StudioApp() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [wsId, setWsId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [locale, setLocale] = useState<"es" | "en">("es");
  const [busy, setBusy] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [activeTab, setActiveTab] = useState<StudioTab>("chat");
  const [uploadedAsset, setUploadedAsset] = useState<Asset | null>(null);
  const [pendingOptions, setPendingOptions] = useState<VideoOption[] | null>(null);
  const [selectedOption, setSelectedOption] = useState<VideoOption | null>(null);
  const [estimatedCostCents, setEstimatedCostCents] = useState(0);

  const { activeJob, setActiveJob } = useGenerationSocket({
    workspaceId: wsId,
    projectId,
  });

  const t = (es: string, en: string) => (locale === "es" ? es : en);
  const ready = Boolean(wsId && projectId);

  const loadChat = useCallback(async (w: string, p: string) => {
    const hist = await api<ChatMsg[]>(`/api/workspaces/${w}/projects/${p}/chat`);
    setMessages(hist);
    const last = [...hist].reverse().find((m) => m.role === "assistant" && m.toolTrace?.videoOptions);
    if (last?.toolTrace?.videoOptions && !last.toolTrace.selectedOption) {
      setPendingOptions(last.toolTrace.videoOptions);
    } else {
      setPendingOptions(null);
    }
    const picked = [...hist].reverse().find((m) => m.role === "assistant" && m.toolTrace?.selectedOption);
    if (picked?.toolTrace?.selectedOption && !picked.toolTrace.generationJob) {
      setSelectedOption(picked.toolTrace.selectedOption);
      setEstimatedCostCents(picked.toolTrace.estimatedCostCents ?? 0);
    } else if (picked?.toolTrace?.generationJob) {
      setSelectedOption(null);
      setActiveJob({
        jobId: picked.toolTrace.generationJob.id,
        status: picked.toolTrace.generationJob.status,
        progress: picked.toolTrace.generationJob.progress,
        provider: picked.toolTrace.generationJob.provider,
        costCents: picked.toolTrace.generationJob.costCents,
        outputUrl: picked.toolTrace.generationJob.outputUrl,
      });
    }
  }, [setActiveJob]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingOptions, busy]);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<User>("/api/auth/me");
        setUser(me);
        const list = await api<Workspace[]>("/api/workspaces");
        setWorkspaces(list);
        const first = list[0];
        if (!first) return;
        setWsId(first.id);
        const ps = await api<Project[]>(`/api/workspaces/${first.id}/projects`);
        setProjects(ps);
        if (ps[0]) {
          setProjectId(ps[0].id);
          await loadChat(first.id, ps[0].id);
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [loadChat, router]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !ready || busy) return;
    const text = draft.trim();
    setDraft("");
    setMessages((m) => [
      ...m,
      { id: String(Date.now()), role: "user", content: text },
    ]);
    setBusy(true);

    try {
      const res = await api<{ reply: string; toolTrace?: any }>(
        `/api/workspaces/${wsId}/projects/${projectId}/chat`,
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
            locale,
            assetId: uploadedAsset?.id,
          }),
        },
      );
      setMessages((m) => [
        ...m,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: res.reply,
          toolTrace: res.toolTrace,
        },
      ]);
      if (res.toolTrace?.videoOptions) {
        setPendingOptions(res.toolTrace.videoOptions);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: (err as Error).message,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function pickOption(opt: VideoOption) {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const res = await api<{
        reply: string;
        toolTrace?: any;
      }>(`/api/workspaces/${wsId}/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          action: "select_option",
          optionId: opt.id,
          locale,
          assetId: uploadedAsset?.id,
        }),
      });

      setSelectedOption(opt);
      setEstimatedCostCents(res.toolTrace?.estimatedCostCents ?? opt.estimatedCostCents);
      setPendingOptions(null);

      setMessages((m) => [
        ...m,
        {
          id: String(Date.now()),
          role: "assistant",
          content: res.reply,
          toolTrace: res.toolTrace,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: "err2", role: "assistant", content: (err as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmGenerate() {
    if (!ready || !selectedOption || busy) return;
    setBusy(true);
    try {
      const res = await api<{
        reply: string;
        toolTrace?: any;
      }>(`/api/workspaces/${wsId}/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          action: "confirm_generation",
          optionId: selectedOption.id,
          locale,
          assetId: uploadedAsset?.id,
        }),
      });

      setSelectedOption(null);
      setMessages((m) => [
        ...m,
        {
          id: String(Date.now()),
          role: "assistant",
          content: res.reply,
          toolTrace: res.toolTrace,
        },
      ]);

      if (res.toolTrace?.generationJob) {
        const j = res.toolTrace.generationJob;
        setActiveJob({
          jobId: j.id,
          status: j.status,
          progress: j.progress,
          provider: j.provider,
          costCents: j.costCents,
        });
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: "err3", role: "assistant", content: (err as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function createProject(e: FormEvent) {
    e.preventDefault();
    if (!newProject.trim() || !wsId) return;
    const p = await api<Project>(`/api/workspaces/${wsId}/projects`, {
      method: "POST",
      body: JSON.stringify({ name: newProject.trim() }),
    });
    setProjects((prev) => [...prev, p]);
    setProjectId(p.id);
    setNewProject("");
    setUploadedAsset(null);
    await loadChat(wsId, p.id);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="shimmer h-10 w-48 rounded-[8px]" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row bg-[#080E0B]">
      {/* Sidebar Navigation */}
      <aside className="elevation-card m-3 flex w-auto shrink-0 flex-col gap-4 p-4 lg:m-4 lg:w-72 border border-[#13251C]">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" alt="" />
          <div>
            <p className="brand-serif text-sm leading-tight text-[#E7EFE9]">editD</p>
            <p className="text-[10px] tracking-[0.18em] text-[#C7CDD1]/80">LCS.Dominican</p>
            <p className="text-xs text-[#2FA84F]">{user.name}</p>
          </div>
        </div>

        <div className="rounded-[8px] bg-[#0C1712] px-3 py-2 text-xs text-[#2FA84F] border border-[#13251C]">
          {t("Plan Pro Studio · IA Ilimitada", "Pro Studio Plan · Unlimited AI")}
        </div>

        <label className="text-xs uppercase tracking-wider text-[#C7CDD1]">
          Workspace
          <select
            className="mt-1 w-full rounded-[8px] bg-[#0C1712] px-2 py-2 text-sm text-[#E7EFE9] border border-[#13251C]"
            value={wsId}
            onChange={async (e) => {
              const id = e.target.value;
              setWsId(id);
              setUploadedAsset(null);
              const ps = await api<Project[]>(`/api/workspaces/${id}/projects`);
              setProjects(ps);
              if (ps[0]) {
                setProjectId(ps[0].id);
                await loadChat(id, ps[0].id);
              } else {
                setProjectId("");
                setMessages([]);
              }
            }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-[#C7CDD1]">
          {t("Proyecto", "Project")}
          <select
            className="mt-1 w-full rounded-[8px] bg-[#0C1712] px-2 py-2 text-sm text-[#E7EFE9] border border-[#13251C]"
            value={projectId}
            onChange={async (e) => {
              setProjectId(e.target.value);
              setUploadedAsset(null);
              await loadChat(wsId, e.target.value);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={createProject} className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-[8px] bg-[#0C1712] px-2 py-2 text-sm border border-[#13251C]"
            placeholder={t("Nuevo proyecto", "New project")}
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
          />
          <button className="rounded-[8px] bg-[#2FA84F] px-3 text-[#0C1712] font-bold" type="submit">
            +
          </button>
        </form>

        {ready ? (
          <CreatorUpload
            workspaceId={wsId}
            projectId={projectId}
            locale={locale}
            current={uploadedAsset}
            disabled={busy}
            onUploaded={setUploadedAsset}
            onClear={() => setUploadedAsset(null)}
          />
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-6">
          <CollaboratorMark size="sm" />
          <p className="text-[10px] leading-tight text-[#C7CDD1]/70">
            {t("En colaboración con Logic Code Spot", "In collaboration with Logic Code Spot")}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-3">
          <button
            className="text-xs text-[#C7CDD1] hover:text-[#2FA84F]"
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            type="button"
          >
            {locale.toUpperCase()}
          </button>
          <button className="text-xs text-[#C7CDD1] hover:text-[#E7EFE9]" onClick={logout} type="button">
            {t("Salir", "Log out")}
          </button>
        </div>
      </aside>

      {/* Main Studio Work Area */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3 lg:px-0 lg:pb-4 lg:pr-4">
        {/* Studio Tabs Navigation */}
        <div className="my-3 flex flex-wrap items-center gap-1.5 rounded-[14px] bg-[#0C1712] p-1.5 border border-[#13251C] shadow-inner">
          {[
            { id: "chat", name: t("💬 Creador & Chat", "💬 Creator & Chat") },
            { id: "generator", name: t("✨ Estudio Generativo", "✨ Generative Studio") },
            { id: "cinema", name: t("🎬 Cinema Director", "🎬 Cinema Director") },
            { id: "lipsync", name: t("🗣️ LipSync & Audio", "🗣️ LipSync & Audio") },
            { id: "workflow", name: t("⚡ Visual Workflows", "⚡ Visual Workflows") },
            { id: "prompts", name: t("🎯 Prompt Director", "🎯 Prompt Director") },
            { id: "video", name: t("🎞️ Editor de Video", "🎞️ Video Editor") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as StudioTab)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === tab.id
                  ? "bg-[#2FA84F] text-[#0C1712] shadow-sm shadow-[#2FA84F]/30"
                  : "text-[#C7CDD1]/70 hover:text-[#E7EFE9] hover:bg-[#13251C]/60"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Studio Panel Container */}
        <div className="elevation-card flex min-h-[75vh] flex-1 flex-col p-5 border border-[#13251C]">
          {activeTab === "generator" ? (
            <StudioGenerator
              workspaceId={wsId}
              projectId={projectId}
              onJobStarted={(job) => {
                setActiveJob(job);
              }}
              locale={locale}
            />
          ) : activeTab === "cinema" ? (
            <CinemaStudio
              workspaceId={wsId}
              projectId={projectId}
              onJobStarted={(job) => {
                setActiveJob(job);
              }}
              locale={locale}
            />
          ) : activeTab === "lipsync" ? (
            <LipSyncAudioStudio
              workspaceId={wsId}
              projectId={projectId}
              onJobStarted={(job) => {
                setActiveJob(job);
              }}
              locale={locale}
            />
          ) : activeTab === "workflow" ? (
            <VisualWorkflowStudio
              workspaceId={wsId}
              projectId={projectId}
              locale={locale}
            />
          ) : activeTab === "prompts" ? (
            <PromptDirectorStudio
              locale={locale}
              onUsePrompt={(prompt) => {
                setDraft(prompt);
                setActiveTab("generator");
              }}
            />
          ) : activeTab === "video" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[#E7EFE9]">
                {t("Línea de Tiempo & Editor de Video", "Timeline & Video Editor")}
              </h2>
              <VideoEditorChunk />
            </div>
          ) : (
            /* Default: Chat & Creator Orchestrator */
            <div className="flex flex-1 flex-col">
              <h1 className="brand-serif mb-1 text-2xl text-[#E7EFE9]">
                {t("Agente Creativo editD", "editD Creative Agent")}
              </h1>
              <p className="mb-4 text-xs text-[#C7CDD1]/80">
                {t(
                  "Sube imagen + describe tu video. Te propongo direcciones y refinamos juntos.",
                  "Upload image + describe your video. I'll propose directions and we refine together.",
                )}
              </p>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[50vh]">
                {messages.length === 0 ? (
                  <div className="space-y-2 text-sm text-[#E7EFE9]/70">
                    <p>{t("Ejemplos para empezar:", "Examples to get started:")}</p>
                    <ul className="list-inside list-disc space-y-1 text-xs">
                      <li>{t("Video de marca para Instagram Reels", "Brand video for Instagram Reels")}</li>
                      <li>{t("Promo cuadrado para feed con mi logo", "Square feed promo with my logo")}</li>
                      <li>{t("Intro cinematográfica 16:9 para YouTube", "Cinematic 16:9 intro for YouTube")}</li>
                    </ul>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[95%] rounded-[16px] px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-[#1E7A3E] text-[#E7EFE9]"
                          : "bg-[#0C1712] text-[#E7EFE9]/90 border border-[#13251C]"
                      }`}
                    >
                      {renderMarkdownLite(m.content)}
                      {m.toolTrace?.selectedOption ? (
                        <div className="mt-2 rounded-[8px] border border-[#2FA84F]/30 bg-[#13251C] p-2 text-xs">
                          ✓ {m.toolTrace.selectedOption.title} · {m.toolTrace.selectedOption.aspectRatio}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                {busy ? <div className="shimmer h-12 w-2/3 rounded-[16px]" aria-label="Pensando" /> : null}
                <div ref={bottomRef} />
              </div>

              {pendingOptions?.length ? (
                <div className="mt-4 border-t border-[#C7CDD1]/10 pt-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-[#C7CDD1]">
                    {t("Elige una dirección", "Pick a direction")}
                  </p>
                  <VideoOptionsPanel
                    options={pendingOptions}
                    selectedId={selectedOption?.id}
                    onSelect={pickOption}
                    disabled={busy}
                    locale={locale}
                  />
                </div>
              ) : null}

              {selectedOption ? (
                <div className="mt-4 border-t border-[#C7CDD1]/10 pt-4">
                  <GenerateVideoCTA
                    option={selectedOption}
                    estimatedCostCents={estimatedCostCents}
                    onGenerate={confirmGenerate}
                    disabled={busy}
                    locale={locale}
                  />
                </div>
              ) : null}

              {activeJob ? (
                <div className="mt-4">
                  <GenerationProgress job={activeJob} locale={locale} />
                </div>
              ) : null}

              <form onSubmit={send} className="mt-4 flex gap-2 border-t border-[#C7CDD1]/10 pt-4">
                <input
                  className="flex-1 rounded-[12px] bg-[#0C1712] px-4 py-3 text-sm text-[#E7EFE9] placeholder-[#C7CDD1]/40 border border-[#13251C] focus:border-[#2FA84F] focus:outline-none"
                  placeholder={
                    uploadedAsset
                      ? t(
                          `Instrucciones para "${uploadedAsset.filename}"...`,
                          `Instructions for "${uploadedAsset.filename}"...`,
                        )
                      : t(
                          "Describe el video que quieres crear...",
                          "Describe the video you want to create...",
                        )
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!ready || busy}
                />
                <button
                  className="rounded-[12px] bg-[#2FA84F] px-5 py-3 text-sm font-semibold text-[#0C1712] disabled:opacity-40 hover:bg-[#2FA84F]/90 transition-colors"
                  type="submit"
                  disabled={!ready || busy || !draft.trim()}
                >
                  {t("Enviar", "Send")}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
