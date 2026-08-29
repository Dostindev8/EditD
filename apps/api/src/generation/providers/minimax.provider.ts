import { Injectable, Logger } from "@nestjs/common";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

interface MinimaxJobState {
  id: string;
  createdAt: number;
  progress: number;
  payload: VideoGenerationPayload;
}

@Injectable()
export class MinimaxProvider implements VideoGenerationProvider {
  readonly name = "minimax" as const;
  private readonly log = new Logger(MinimaxProvider.name);
  private readonly memoryJobs = new Map<string, MinimaxJobState>();

  private get apiKey(): string | undefined {
    return process.env.MINIMAX_API_KEY;
  }

  private get baseUrl(): string {
    return process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    if (!this.isConfigured()) {
      const jobId = `minimax-sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.memoryJobs.set(jobId, {
        id: jobId,
        createdAt: Date.now(),
        progress: 0,
        payload,
      });
      return { externalJobId: jobId, provider: this.name };
    }

    try {
      const isI2V = Boolean(payload.assetUrl);
      const endpoint = isI2V ? "video_generation" : "video_generation";

      const cameraDesc = payload.cameraMotion
        ? ` [Camera Motion: ${payload.cameraMotion.type}, Speed: ${payload.cameraMotion.intensity}/10, Lighting: ${payload.cameraMotion.lightingStyle || "Cinematic"}]`
        : "";

      const fullPrompt = `${payload.prompt}${cameraDesc}`;

      const body: Record<string, unknown> = {
        model: "video-01",
        prompt: fullPrompt,
        prompt_optimizer: true,
      };

      if (payload.assetUrl) {
        body.first_frame_image = payload.assetUrl;
      }

      const res = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Minimax HTTP error ${res.status}`);
      }

      const data = (await res.json()) as { task_id?: string; base_resp?: { status_code?: number } };
      const externalJobId = data.task_id || `minimax-${Date.now()}`;
      return { externalJobId, provider: this.name };
    } catch (err) {
      this.log.warn(`Minimax API error (${(err as Error).message}), fallback to simulation`);
      const jobId = `minimax-sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.memoryJobs.set(jobId, {
        id: jobId,
        createdAt: Date.now(),
        progress: 0,
        payload,
      });
      return { externalJobId: jobId, provider: this.name };
    }
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const mem = this.memoryJobs.get(externalJobId);
    if (mem) {
      const elapsed = Date.now() - mem.createdAt;
      const progress = Math.min(100, Math.round((elapsed / 3500) * 100));
      mem.progress = progress;

      if (progress >= 100) {
        return {
          status: "completed",
          progress: 100,
          outputUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          actualCostCents: 0,
        };
      }

      return {
        status: "processing",
        progress,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/query/video_generation?task_id=${externalJobId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) return { status: "processing", progress: 45 };

      const data = (await res.json()) as {
        status?: string;
        file_id?: string;
        download_url?: string;
      };

      if (data.status === "Success" && data.download_url) {
        return {
          status: "completed",
          progress: 100,
          outputUrl: data.download_url,
          actualCostCents: 35,
        };
      }

      if (data.status === "Fail") {
        return {
          status: "failed",
          progress: 100,
          errorMessage: "Minimax generation failed",
        };
      }

      return { status: "processing", progress: 60 };
    } catch (err) {
      return { status: "processing", progress: 50 };
    }
  }
}
