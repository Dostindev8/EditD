import { Injectable, Logger } from "@nestjs/common";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

interface LipSyncJobState {
  id: string;
  createdAt: number;
  progress: number;
  payload: VideoGenerationPayload;
}

@Injectable()
export class LipSyncProvider implements VideoGenerationProvider {
  readonly name = "lipsync" as const;
  private readonly log = new Logger(LipSyncProvider.name);
  private readonly memoryJobs = new Map<string, LipSyncJobState>();

  private get apiKey(): string | undefined {
    return process.env.LIPSYNC_API_KEY || process.env.MUAPI_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const jobId = `lipsync-job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.memoryJobs.set(jobId, {
      id: jobId,
      createdAt: Date.now(),
      progress: 0,
      payload,
    });
    return { externalJobId: jobId, provider: this.name };
  }

  async poll(externalJobId: string): Promise<ProviderPollResult> {
    const mem = this.memoryJobs.get(externalJobId);
    if (!mem) {
      return { status: "failed", progress: 100, errorMessage: "Job not found" };
    }

    const elapsed = Date.now() - mem.createdAt;
    const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
    mem.progress = progress;

    if (progress >= 100) {
      return {
        status: "completed",
        progress: 100,
        outputUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        actualCostCents: 0,
      };
    }

    return {
      status: "processing",
      progress,
    };
  }
}
