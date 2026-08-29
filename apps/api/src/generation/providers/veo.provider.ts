import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

@Injectable()
export class VeoProvider implements VideoGenerationProvider {
  readonly name = "veo" as const;
  private readonly log = new Logger(VeoProvider.name);

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_VEO_API_KEY);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const key = process.env.GOOGLE_VEO_API_KEY;
    if (!key) throw new Error("Google Veo API key not configured");

    const externalJobId = randomUUID();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: payload.prompt.slice(0, 2000) }],
            parameters: {
              aspectRatio: payload.aspectRatio,
              durationSeconds: Math.min(8, payload.durationSec),
            },
          }),
          signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 25000)),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Veo ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { name?: string; operation?: { name?: string } };
      const id = data.name ?? data.operation?.name ?? externalJobId;
      return { externalJobId: id, provider: this.name };
    } catch (e) {
      this.log.warn(`Veo submit failed: ${(e as Error).message}`);
      throw e;
    }
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const key = process.env.GOOGLE_VEO_API_KEY;
    if (!key) return { status: "failed", progress: 0, errorMessage: "Veo not configured" };

    try {
      const opName = externalJobId.startsWith("operations/") ? externalJobId : `operations/${externalJobId}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${key}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!res.ok) {
        return { status: "failed", progress: 0, errorMessage: `Veo poll ${res.status}` };
      }
      const data = (await res.json()) as {
        done?: boolean;
        error?: { message?: string };
        response?: { generatedVideos?: Array<{ uri?: string }> };
        metadata?: { progressPercent?: number };
      };
      if (data.error) {
        return { status: "failed", progress: 0, errorMessage: data.error.message ?? "Veo error" };
      }
      if (data.done) {
        const uri = data.response?.generatedVideos?.[0]?.uri;
        return {
          status: "completed",
          progress: 100,
          outputUrl: uri,
          actualCostCents: Number(process.env.VEO_DEFAULT_COST_CENTS ?? 150),
        };
      }
      return {
        status: "processing",
        progress: data.metadata?.progressPercent ?? 25,
      };
    } catch (e) {
      return { status: "processing", progress: 15, errorMessage: (e as Error).message };
    }
  }
}
