import { Injectable, Logger } from "@nestjs/common";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

/**
 * Client for a self-hosted inference server (ComfyUI / OpenAPI-compatible).
 * Zero marginal cost per call when the GPU is already running — used for free-tier workspaces.
 */
@Injectable()
export class SelfHostedProvider implements VideoGenerationProvider {
  readonly name = "self-hosted" as const;
  private readonly log = new Logger(SelfHostedProvider.name);

  private get baseUrl(): string {
    return (process.env.SELFHOSTED_INFERENCE_URL ?? "").replace(/\/$/, "");
  }

  private get timeoutMs(): number {
    return Number(process.env.SELFHOSTED_INFERENCE_TIMEOUT_MS ?? 180000);
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    if (!this.isConfigured()) {
      throw new Error("SELFHOSTED_INFERENCE_URL no está configurada");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/v1/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SELFHOSTED_INFERENCE_TOKEN
            ? { Authorization: `Bearer ${process.env.SELFHOSTED_INFERENCE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          negative_prompt: payload.negativePrompt,
          aspect_ratio: payload.aspectRatio,
          duration_sec: payload.durationSec,
          image_url: payload.assetUrl,
          end_image_url: payload.endImageUrl,
          audio_url: payload.audioUrl,
          modality: payload.modality ?? "video",
          model_id: payload.modelId,
          steps: payload.steps,
          cfg_scale: payload.cfgScale,
          seed: payload.seed,
          quality: payload.quality,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Self-hosted submit failed (${res.status}): ${txt}`);
      }

      const data = (await res.json()) as { job_id?: string; id?: string; request_id?: string };
      const externalJobId = data.job_id || data.request_id || data.id;
      if (!externalJobId) {
        throw new Error("Self-hosted submit response missing job_id");
      }
      this.log.log(`Self-hosted job submitted: ${externalJobId}`);
      return { externalJobId, provider: this.name };
    } finally {
      clearTimeout(timer);
    }
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    if (!this.isConfigured()) {
      return { status: "failed", progress: 0, errorMessage: "SELFHOSTED_INFERENCE_URL missing" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/v1/jobs/${encodeURIComponent(externalJobId)}`, {
        headers: {
          ...(process.env.SELFHOSTED_INFERENCE_TOKEN
            ? { Authorization: `Bearer ${process.env.SELFHOSTED_INFERENCE_TOKEN}` }
            : {}),
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return {
          status: "failed",
          progress: 0,
          errorMessage: `Self-hosted poll failed (${res.status}): ${txt}`,
        };
      }

      const data = (await res.json()) as {
        status?: string;
        progress?: number;
        output_url?: string;
        error?: string;
      };

      const statusRaw = (data.status ?? "processing").toLowerCase();
      if (statusRaw === "completed" || statusRaw === "success") {
        return {
          status: "completed",
          progress: 100,
          outputUrl: data.output_url,
          actualCostCents: 0,
        };
      }
      if (statusRaw === "failed" || statusRaw === "error") {
        return {
          status: "failed",
          progress: data.progress ?? 0,
          errorMessage: data.error ?? "Self-hosted inference failed",
        };
      }
      return {
        status: "processing",
        progress: Math.min(99, Math.max(1, Number(data.progress ?? 10))),
      };
    } catch (e) {
      return {
        status: "failed",
        progress: 0,
        errorMessage: (e as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
