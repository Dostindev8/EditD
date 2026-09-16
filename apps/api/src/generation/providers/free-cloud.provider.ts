import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

type JobMem = {
  payload: VideoGenerationPayload;
  startedAt: number;
  seed: number;
};

/**
 * Zero-key cloud inference via Pollinations (FLUX / turbo).
 * Used when paid APIs and SELFHOSTED_INFERENCE_URL are absent — real images, $0 marginal.
 * Video jobs produce a cinematic keyframe (HD still) until a GPU/self-hosted video pipeline is wired.
 */
@Injectable()
export class FreeCloudProvider implements VideoGenerationProvider {
  readonly name = "free-cloud" as const;
  private readonly log = new Logger(FreeCloudProvider.name);
  private readonly jobs = new Map<string, JobMem>();

  isConfigured(): boolean {
    return process.env.FREE_CLOUD_ENABLED !== "false";
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const externalJobId = randomUUID();
    const seed =
      typeof payload.seed === "number" && Number.isFinite(payload.seed)
        ? Math.abs(Math.trunc(payload.seed))
        : Math.floor(Math.random() * 1_000_000_000);
    this.jobs.set(externalJobId, { payload, startedAt: Date.now(), seed });
    this.log.log(
      `Free-cloud job ${externalJobId} (${payload.modality ?? "video"} / ${payload.modelId ?? "flux"})`,
    );
    return { externalJobId, provider: this.name };
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const mem = this.jobs.get(externalJobId);
    if (!mem) {
      return { status: "failed", progress: 0, errorMessage: "Free-cloud job not found" };
    }

    const warmMs = Number(process.env.FREE_CLOUD_WARMUP_MS ?? 1800);
    const elapsed = Date.now() - mem.startedAt;
    if (elapsed < warmMs) {
      return {
        status: "processing",
        progress: Math.min(90, Math.max(8, Math.round((elapsed / warmMs) * 85))),
      };
    }

    try {
      const url = this.buildOutputUrl(mem.payload, mem.seed);
      // Warm the CDN so the client gets a ready asset (HEAD, then soft GET timeout).
      await this.warmup(url);
      this.jobs.delete(externalJobId);
      return {
        status: "completed",
        progress: 100,
        outputUrl: url,
        actualCostCents: 0,
      };
    } catch (e) {
      this.jobs.delete(externalJobId);
      return {
        status: "failed",
        progress: 0,
        errorMessage: (e as Error).message || "Free-cloud generation failed",
      };
    }
  }

  private buildOutputUrl(payload: VideoGenerationPayload, seed: number): string {
    const { width, height } = this.resolveSize(payload.aspectRatio, payload.quality);
    const model = this.resolveModel(payload.modelId, payload.modality);
    const prompt = this.composePrompt(payload);
    const encoded = encodeURIComponent(prompt).replace(/%20/g, "%20");
    const base = (process.env.FREE_CLOUD_IMAGE_BASE || "https://image.pollinations.ai/prompt").replace(
      /\/$/,
      "",
    );
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: "true",
      enhance: "true",
      model,
    });
    // Stable cache-bust per job while remaining CDN-friendly
    const tag = createHash("sha256").update(`${prompt}:${seed}`).digest("hex").slice(0, 10);
    params.set("v", tag);
    return `${base}/${encoded}?${params.toString()}`;
  }

  private composePrompt(payload: VideoGenerationPayload): string {
    const bits = [payload.prompt.trim()];
    if (payload.modality === "video") {
      bits.push(
        "cinematic still from a motion picture, film grain, dramatic lighting, keyframe, ultra detailed",
      );
    } else {
      bits.push("masterpiece, best quality, sharp focus");
    }
    if (payload.negativePrompt?.trim()) {
      bits.push(`Avoid: ${payload.negativePrompt.trim()}`);
    }
    return bits.join(". ").slice(0, 1800);
  }

  private resolveModel(modelId?: string, modality?: string): string {
    const id = (modelId ?? "").toLowerCase();
    if (id.includes("schnell") || id.includes("turbo") || id.includes("fast")) return "turbo";
    if (id.includes("flux") || modality === "image" || modality === "video") return "flux";
    return process.env.FREE_CLOUD_DEFAULT_MODEL || "flux";
  }

  private resolveSize(
    aspectRatio: string,
    quality?: "standard" | "hd" | "4k",
  ): { width: number; height: number } {
    const q = quality === "4k" ? 1.5 : quality === "hd" ? 1.25 : 1;
    const table: Record<string, [number, number]> = {
      "1:1": [1024, 1024],
      "16:9": [1280, 720],
      "9:16": [720, 1280],
      "21:9": [1536, 640],
      "4:5": [1024, 1280],
      "3:4": [960, 1280],
      "4:3": [1280, 960],
      "3:2": [1280, 854],
      "2:3": [854, 1280],
    };
    const [w0, h0] = table[aspectRatio] ?? [1024, 1024];
    const width = Math.min(1536, Math.round(w0 * q));
    const height = Math.min(1536, Math.round(h0 * q));
    return { width, height };
  }

  private async warmup(url: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.FREE_CLOUD_TIMEOUT_MS ?? 90000));
    try {
      const head = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
      if (head.ok) return;
      const get = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { Accept: "image/*" },
      });
      if (!get.ok) {
        throw new Error(`Free-cloud CDN returned ${get.status}`);
      }
      // Drain a small amount so the edge caches the object
      await get.arrayBuffer().catch(() => undefined);
    } finally {
      clearTimeout(timer);
    }
  }
}
