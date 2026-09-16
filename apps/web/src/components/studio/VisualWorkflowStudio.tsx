"use client";

import { useState } from "react";
import type { VisualWorkflow, WorkflowNode } from "@lcs/shared";

interface VisualWorkflowStudioProps {
  workspaceId: string;
  projectId: string;
  locale: "es" | "en";
}

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "node-1",
    type: "prompt",
    title: "1. Prompt Director & Storyboard",
    data: { text: "Cyberpunk commercial in futuristic Santo Domingo with neon lights and flying cars" },
    position: { x: 50, y: 100 },
  },
  {
    id: "node-2",
    type: "image_gen",
    title: "2. Keyframe Gen (FLUX.1 Dev)",
    data: { model: "FLUX.1 Dev", aspectRatio: "16:9", steps: 30 },
    position: { x: 380, y: 100 },
  },
  {
    id: "node-3",
    type: "video_gen",
    title: "3. Video Motion (Minimax Hailuo)",
    data: { model: "Hailuo H3", motion: "Dolly In", duration: 10 },
    position: { x: 710, y: 100 },
  },
  {
    id: "node-4",
    type: "audio_sfx",
    title: "4. Soundtrack (MusicGen)",
    data: { genre: "Synthwave 80s", duration: 10 },
    position: { x: 710, y: 280 },
  },
  {
    id: "node-5",
    type: "export",
    title: "5. Final Master Video (4K Pro)",
    data: { format: "MP4 H.264", bitrate: "50 Mbps" },
    position: { x: 1040, y: 180 },
  },
];

export function VisualWorkflowStudio({ locale }: VisualWorkflowStudioProps) {
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [activeNode, setActiveNode] = useState<WorkflowNode | null>(nodes[0]);
  const [running, setRunning] = useState(false);
  const [progressStep, setProgressStep] = useState<number | null>(null);

  const handleRunPipeline = async () => {
    setRunning(true);
    for (let i = 0; i < nodes.length; i++) {
      setProgressStep(i);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setProgressStep(null);
    setRunning(false);
    alert(t("¡Pipeline generativo completado con éxito!", "Generative pipeline completed successfully!"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2FA84F]/20 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-wide text-[#E7EFE9]">
            {t("Visual AI Workflow Builder", "Visual AI Workflow Builder")}
          </h2>
          <p className="mt-1 text-xs text-[#C7CDD1]/80">
            {t(
              "Diseña, conecta y automatiza cadenas de generación multimodal: Prompt ➔ Imagen ➔ Video ➔ Audio ➔ Master 4K.",
              "Design, connect, and automate multi-modal generation pipelines: Prompt ➔ Image ➔ Video ➔ Audio ➔ 4K Master.",
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={running}
          className="flex items-center gap-2 rounded-[12px] bg-[#2FA84F] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0C1712] hover:bg-[#2FA84F]/90 transition-all shadow-md shadow-[#2FA84F]/20 disabled:opacity-50"
        >
          <span>{running ? "⚡" : "▶"}</span>
          <span>{running ? t("Ejecutando Pipeline...", "Running Pipeline...") : t("Ejecutar Flujo Completo", "Run Complete Workflow")}</span>
        </button>
      </div>

      {/* Visual Canvas Area */}
      <div className="relative overflow-x-auto rounded-[20px] border border-[#13251C] bg-[#0C1712]/90 p-4 sm:p-6 md:p-8 backdrop-blur-xl min-h-[280px] sm:min-h-[360px] md:min-h-[440px] -mx-1 sm:mx-0">
        {/* Grid dots background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(#2FA84F 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Nodes: wrap on mobile; horizontal scroll only when needed */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:flex-wrap xl:flex-nowrap items-stretch sm:items-center gap-4 sm:gap-6 w-full sm:min-w-0 xl:min-w-[900px]">
          {nodes.map((node, index) => {
            const isSelected = activeNode?.id === node.id;
            const isProcessing = progressStep === index;
            const isDone = progressStep !== null && progressStep > index;

            return (
              <div key={node.id} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div
                  onClick={() => setActiveNode(node)}
                  className={`w-full sm:w-56 cursor-pointer rounded-[16px] border p-4 transition-all ${
                    isProcessing
                      ? "border-[#2FA84F] bg-[#13251C] ring-2 ring-[#2FA84F] shadow-lg shadow-[#2FA84F]/30 animate-pulse"
                      : isDone
                      ? "border-[#2FA84F]/70 bg-[#0C1712]"
                      : isSelected
                      ? "border-[#2FA84F] bg-[#13251C] shadow-md shadow-[#2FA84F]/20"
                      : "border-[#13251C] bg-[#0C1712] hover:border-[#2FA84F]/50"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#13251C] pb-2 mb-2">
                    <span className="text-[11px] font-semibold text-[#E7EFE9] truncate">{node.title}</span>
                    <span className="text-xs">
                      {isProcessing ? "⏳" : isDone ? "✅" : "⚙️"}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-[#C7CDD1]/70">
                    {Object.entries(node.data).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}:</span>
                        <span className="font-mono text-[#E7EFE9] truncate max-w-[100px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {index < nodes.length - 1 ? (
                  <div className="text-[#2FA84F] font-bold text-lg rotate-90 sm:rotate-0" aria-hidden>
                    ➔
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector */}
      {activeNode ? (
        <div className="rounded-[16px] border border-[#13251C] bg-[#0C1712]/80 p-5 backdrop-blur-md">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2FA84F] mb-3">
            {t("Inspector del Nodo:", "Node Inspector:")} {activeNode.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {Object.entries(activeNode.data).map(([key, val]) => (
              <div key={key} className="rounded-[10px] bg-[#13251C]/60 p-3 border border-[#13251C]">
                <label className="block uppercase text-[10px] text-[#C7CDD1]/70 mb-1">{key}</label>
                <input
                  type="text"
                  defaultValue={String(val)}
                  onChange={(e) => {
                    const updated = nodes.map((n) =>
                      n.id === activeNode.id
                        ? { ...n, data: { ...n.data, [key]: e.target.value } }
                        : n,
                    );
                    setNodes(updated);
                  }}
                  className="w-full bg-transparent text-[#E7EFE9] font-medium focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
