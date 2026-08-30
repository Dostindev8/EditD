"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

export type GenerationJobState = {
  jobId: string;
  status: string;
  progress: number;
  provider?: string;
  costCents?: number;
  outputUrl?: string;
  error?: string;
};

type Props = {
  workspaceId: string;
  projectId: string;
  onUpdate?: (job: GenerationJobState) => void;
};

export function useGenerationSocket({ workspaceId, projectId, onUpdate }: Props) {
  const socketRef = useRef<Socket | null>(null);
  const [activeJob, setActiveJob] = useState<GenerationJobState | null>(null);

  useEffect(() => {
    if (!workspaceId || !projectId) return;

    const socket = io(SOCKET_URL || undefined, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:project", { workspaceId, projectId });
    });

    const upsert = (partial: Partial<GenerationJobState> & { jobId: string }) => {
      setActiveJob((prev) => {
        const next: GenerationJobState = {
          jobId: partial.jobId,
          status: partial.status ?? prev?.status ?? "queued",
          progress: partial.progress ?? prev?.progress ?? 0,
          provider: partial.provider ?? prev?.provider,
          costCents: partial.costCents ?? prev?.costCents,
          outputUrl: partial.outputUrl ?? prev?.outputUrl,
          error: partial.error ?? prev?.error,
        };
        onUpdate?.(next);
        return next;
      });
    };

    socket.on("job:encolado", (p: { jobId: string; status?: string; progress?: number; provider?: string; costCents?: number }) => {
      upsert({
        jobId: p.jobId,
        status: p.status ?? "queued",
        progress: p.progress ?? 0,
        provider: p.provider,
        costCents: p.costCents,
      });
    });

    socket.on("job:progress", (p: { jobId: string; status?: string; progress?: number }) => {
      upsert({ jobId: p.jobId, status: p.status ?? "processing", progress: p.progress ?? 0 });
    });

    socket.on("job:completed", (p: { jobId: string; outputUrl?: string; provider?: string; costCents?: number }) => {
      upsert({
        jobId: p.jobId,
        status: "completed",
        progress: 100,
        outputUrl: p.outputUrl,
        provider: p.provider,
        costCents: p.costCents,
      });
    });

    socket.on("job:failed", (p: { jobId: string; error?: string }) => {
      upsert({ jobId: p.jobId, status: "failed", progress: 0, error: p.error });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, projectId, onUpdate]);

  return { activeJob, setActiveJob };
}
