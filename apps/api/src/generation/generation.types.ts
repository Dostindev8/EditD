import type { CameraMotionConfig, GenerationModality } from "@lcs/shared";

export type GenerationProviderName =
  | "runway"
  | "veo"
  | "muapi"
  | "minimax"
  | "lipsync"
  | "audio"
  | "self-hosted"
  | "free-cloud"
  | "dev-mock";

export type VideoGenerationPayload = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  durationSec: number;
  assetUrl?: string;
  endImageUrl?: string;
  audioUrl?: string;
  modality?: GenerationModality;
  modelId?: string;
  cameraMotion?: CameraMotionConfig;
  quality?: "standard" | "hd" | "4k";
  steps?: number;
  cfgScale?: number;
  seed?: number;
};

export type ProviderSubmitResult = {
  externalJobId: string;
  provider: GenerationProviderName;
};

export type ProviderPollResult = {
  status: "processing" | "completed" | "failed";
  progress: number;
  outputUrl?: string;
  errorMessage?: string;
  actualCostCents?: number;
};

export interface VideoGenerationProvider {
  readonly name: GenerationProviderName;
  isConfigured(): boolean;
  submit(payload: VideoGenerationPayload): Promise<ProviderSubmitResult>;
  poll(externalJobId: string): Promise<ProviderPollResult>;
}

export type GenerationSocketEvent =
  | "job:encolado"
  | "job:progress"
  | "job:completed"
  | "job:failed";

export type GenerationJobPublic = {
  id: string;
  workspaceId: string;
  projectId: string;
  status: string;
  progress: number;
  provider: string;
  costCents: number;
  outputUrl?: string;
  errorMessage?: string;
  createdAt?: Date;
};
