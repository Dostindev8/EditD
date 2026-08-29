import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

@Injectable()
export class DevMockProvider implements VideoGenerationProvider {
  readonly name = "dev-mock" as const;
  private readonly log = new Logger(DevMockProvider.name);
  private jobs = new Map<string, { startedAt: number; durationMs: number }>();

  isConfigured(): boolean {
    return true;
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const id = randomUUID();
    const durationMs = Math.min(12000, Math.max(3000, payload.durationSec * 200));
    this.jobs.set(id, { startedAt: Date.now(), durationMs });
    this.log.debug(`Mock job ${id} queued (${durationMs}ms)`);
    return { externalJobId: id, provider: this.name };
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const job = this.jobs.get(externalJobId);
    if (!job) return { status: "failed", progress: 0, errorMessage: "Mock job not found" };

    const elapsed = Date.now() - job.startedAt;
    const ratio = Math.min(1, elapsed / job.durationMs);

    if (ratio >= 1) {
      this.jobs.delete(externalJobId);
      return {
        status: "completed",
        progress: 100,
        outputUrl: process.env.MOCK_VIDEO_URL ?? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        actualCostCents: 0,
      };
    }

    return {
      status: "processing",
      progress: Math.round(ratio * 95),
    };
  }
}
