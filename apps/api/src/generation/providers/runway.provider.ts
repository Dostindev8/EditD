import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

@Injectable()
export class RunwayProvider implements VideoGenerationProvider {
  readonly name = "runway" as const;
  private readonly log = new Logger(RunwayProvider.name);
  private pending = new Map<string, { submittedAt: number }>();

  isConfigured(): boolean {
    return Boolean(process.env.RUNWAY_API_KEY);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const key = process.env.RUNWAY_API_KEY;
    if (!key) throw new Error("Runway API key not configured");

    const externalJobId = randomUUID();
    this.pending.set(externalJobId, { submittedAt: Date.now() });

    try {
      const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          model: "gen3a_turbo",
          promptText: payload.prompt.slice(0, 1000),
          duration: Math.min(10, payload.durationSec),
          ratio: payload.aspectRatio === "9:16" ? "768:1280" : payload.aspectRatio === "1:1" ? "1024:1024" : "1280:768",
          ...(payload.assetUrl ? { promptImage: payload.assetUrl } : {}),
        }),
        signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 25000)),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Runway ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { id?: string; task_id?: string };
      const id = data.id ?? data.task_id ?? externalJobId;
      this.pending.set(id, { submittedAt: Date.now() });
      return { externalJobId: id, provider: this.name };
    } catch (e) {
      this.log.warn(`Runway submit failed: ${(e as Error).message}`);
      throw e;
    }
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const key = process.env.RUNWAY_API_KEY;
    if (!key) return { status: "failed", progress: 0, errorMessage: "Runway not configured" };

    try {
      const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${externalJobId}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": "2024-11-06",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        return { status: "failed", progress: 0, errorMessage: `Runway poll ${res.status}` };
      }
      const data = (await res.json()) as {
        status?: string;
        progress?: number;
        output?: string[];
        failure?: string;
      };
      const st = (data.status ?? "").toLowerCase();
      if (st === "succeeded" || st === "completed") {
        this.pending.delete(externalJobId);
        return {
          status: "completed",
          progress: 100,
          outputUrl: data.output?.[0],
          actualCostCents: Number(process.env.RUNWAY_DEFAULT_COST_CENTS ?? 120),
        };
      }
      if (st === "failed" || st === "cancelled") {
        this.pending.delete(externalJobId);
        return { status: "failed", progress: 0, errorMessage: data.failure ?? "Runway task failed" };
      }
      return {
        status: "processing",
        progress: Math.round((data.progress ?? 0.35) * 100),
      };
    } catch (e) {
      return { status: "processing", progress: 20, errorMessage: (e as Error).message };
    }
  }
}
