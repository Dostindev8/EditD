import { Injectable, Logger } from "@nestjs/common";
import type {
  ProviderPollResult,
  ProviderSubmitResult,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "../generation.types.js";

interface AudioJobState {
  id: string;
  createdAt: number;
  progress: number;
  payload: VideoGenerationPayload;
}

@Injectable()
export class AudioProvider implements VideoGenerationProvider {
  readonly name = "audio" as const;
  private readonly log = new Logger(AudioProvider.name);
  private readonly memoryJobs = new Map<string, AudioJobState>();

  isConfigured(): boolean {
    return true;
  }

  async submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult> {
    const jobId = `audio-job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
      return { status: "failed", progress: 100, errorMessage: "Audio job not found" };
    }

    const elapsed = Date.now() - mem.createdAt;
    const progress = Math.min(100, Math.round((elapsed / 2500) * 100));
    mem.progress = progress;

    if (progress >= 100) {
      return {
        status: "completed",
        progress: 100,
        outputUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
        actualCostCents: 0,
      };
    }

    return {
      status: "processing",
      progress,
    };
  }
}
