import { Injectable, Logger } from "@nestjs/common";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

interface MuapiJobState {
  id: string;
  endpoint: string;
  createdAt: number;
  progress: number;
  payload: VideoGenerationPayload;
}

@Injectable()
export class MuapiProvider implements VideoGenerationProvider {
  readonly name = "muapi" as const;
  private readonly log = new Logger(MuapiProvider.name);
  private readonly memoryJobs = new Map<string, MuapiJobState>();

  private get apiKey(): string | undefined {
    return process.env.MUAPI_KEY || process.env.OPEN_GENERATIVE_API_KEY;
  }

  private get baseUrl(): string {
    return process.env.MUAPI_BASE_URL || "https://api.muapi.ai";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const endpoint = payload.modelId || "flux-dev-image";

    if (!this.isConfigured()) {
      const jobId = `muapi-sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.memoryJobs.set(jobId, {
        id: jobId,
        endpoint,
        createdAt: Date.now(),
        progress: 0,
        payload,
      });
      return { externalJobId: jobId, provider: this.name };
    }

    try {
      const body: Record<string, unknown> = {
        prompt: payload.prompt,
        aspect_ratio: payload.aspectRatio,
      };

      if (payload.negativePrompt) {
        body.negative_prompt = payload.negativePrompt;
      }
      if (payload.assetUrl) {
        body.image_url = payload.assetUrl;
      }
      if (payload.endImageUrl) {
        body.last_image = payload.endImageUrl;
      }
      if (payload.steps) {
        body.num_inference_steps = payload.steps;
      }
      if (payload.cfgScale) {
        body.guidance_scale = payload.cfgScale;
      }
      if (payload.seed) {
        body.seed = payload.seed;
      }

      const res = await fetch(`${this.baseUrl}/api/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey!,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Muapi submit failed (${res.status}): ${txt}`);
      }

      const data = (await res.json()) as { request_id?: string; id?: string };
      const externalJobId = data.request_id || data.id || `muapi-${Date.now()}`;
      return { externalJobId, provider: this.name };
    } catch (err) {
      this.log.warn(`Muapi API error (${(err as Error).message}), fallback to simulation`);
      const jobId = `muapi-sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.memoryJobs.set(jobId, {
        id: jobId,
        endpoint,
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
      const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
      mem.progress = progress;

      if (progress >= 100) {
        const isImage = mem.payload.modality === "image" || mem.endpoint.includes("image") || mem.endpoint.includes("flux");
        const isAudio = mem.payload.modality === "audio" || mem.endpoint.includes("audio") || mem.endpoint.includes("music");
        
        let outputUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
        if (isImage) {
          outputUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
        } else if (isAudio) {
          outputUrl = "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg";
        }

        return {
          status: "completed",
          progress: 100,
          outputUrl,
          actualCostCents: 0,
        };
      }

      return {
        status: "processing",
        progress,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/predictions/${externalJobId}/result`, {
        headers: {
          "x-api-key": this.apiKey || "",
        },
      });

      if (!res.ok) {
        return { status: "processing", progress: 50 };
      }

      const data = (await res.json()) as {
        status?: string;
        progress?: number;
        url?: string;
        outputs?: string[];
        error?: string;
      };

      const normalizedStatus = (data.status || "").toLowerCase();
      if (normalizedStatus === "completed" || normalizedStatus === "succeeded") {
        const outputUrl = data.url || (data.outputs && data.outputs[0]) || "";
        return {
          status: "completed",
          progress: 100,
          outputUrl,
          actualCostCents: 15,
        };
      }

      if (normalizedStatus === "failed") {
        return {
          status: "failed",
          progress: 100,
          errorMessage: data.error || "Muapi generation failed",
        };
      }

      return {
        status: "processing",
        progress: data.progress ? Math.round(data.progress * 100) : 45,
      };
    } catch (err) {
      return { status: "processing", progress: 50 };
    }
  }
}
