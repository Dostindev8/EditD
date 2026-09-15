export type Role = "owner" | "editor" | "viewer";

export type AspectRatio =
  | "9:16"
  | "1:1"
  | "16:9"
  | "21:9"
  | "4:5"
  | "3:4"
  | "4:3"
  | "3:2"
  | "2:3";

export interface VideoOption {
  id: string;
  title: string;
  description: string;
  aspectRatio: AspectRatio;
  durationSec: number;
  style: string;
  cameraMovement: string;
  platform: string;
  estimatedCostCents: number;
  prompt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectSummary {
  id: string;
  workspaceId: string;
  name: string;
}

export interface AssetSummary {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
}

export const AI_TOOLS = [
  "check_budget_and_policy",
  "propose_video_options",
  "enqueue_video_generation",
  "enhance_prompt_cinematic",
  "generate_image_multimodal",
  "generate_video_cinema",
  "generate_lipsync_voiceover",
  "generate_music_audio",
  "execute_workflow_pipeline",
] as const;

export type AiToolName = (typeof AI_TOOLS)[number];

export const FREE_TIER_DAILY_OPTIONS = 20;

// ── Multi-Modal Generative AI Catalogs & Types ──

export type GenerationModality = "image" | "video" | "cinema" | "lipsync" | "audio" | "workflow";

export interface GenerativeModel {
  id: string;
  name: string;
  provider: string;
  modality: GenerationModality;
  description: string;
  endpoint?: string;
  aspectRatios: AspectRatio[];
  supportsImageToVideo?: boolean;
  supportsCameraMotion?: boolean;
  supportsAudio?: boolean;
  maxDurationSec?: number;
  resolutions?: string[];
  defaultResolution?: string;
}

export interface CameraMotionConfig {
  type:
    | "static"
    | "pan_left"
    | "pan_right"
    | "tilt_up"
    | "tilt_down"
    | "zoom_in"
    | "zoom_out"
    | "roll_cw"
    | "roll_ccw"
    | "dolly_in"
    | "dolly_out"
    | "orbit_left"
    | "orbit_right"
    | "crane_up"
    | "fpv_drone";
  intensity: number; // 1 to 10
  focalLengthMm?: 8 | 14 | 24 | 35 | 50 | 85;
  aperture?: "f/1.4" | "f/4" | "f/11";
  lightingStyle?: "golden_hour" | "cyberpunk_neon" | "volumetric_fog" | "studio_softbox" | "film_noir" | "natural_daylight";
}

export interface GenerationRequestPayload {
  modality: GenerationModality;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  durationSec?: number;
  sourceImageUrl?: string;
  endImageUrl?: string;
  sourceAudioUrl?: string;
  cameraMotion?: CameraMotionConfig;
  numOutputs?: number;
  quality?: "standard" | "hd" | "4k";
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

export interface WorkflowNode {
  id: string;
  type: "prompt" | "image_gen" | "video_gen" | "lipsync" | "audio_sfx" | "export";
  title: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface VisualWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const GENERATIVE_MODELS_CATALOG: GenerativeModel[] = [
  // ── Image Models ──
  {
    id: "flux-dev",
    name: "FLUX.1 Dev",
    provider: "Black Forest Labs",
    modality: "image",
    description: "State-of-the-art visual fidelity, typography and complex anatomy rendering.",
    endpoint: "flux-dev-image",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9", "4:5", "3:4", "4:3", "3:2", "2:3"],
    resolutions: ["1024x1024", "1280x720", "720x1280", "1536x640"],
    defaultResolution: "1024x1024",
  },
  {
    id: "flux-schnell",
    name: "FLUX.1 Schnell (Fast)",
    provider: "Black Forest Labs",
    modality: "image",
    description: "Ultra-fast turbo generation with high coherence in 4-8 steps.",
    endpoint: "flux-schnell-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:5", "3:4", "4:3"],
    resolutions: ["1024x1024", "1280x720", "720x1280"],
    defaultResolution: "1024x1024",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "Google Imagen",
    modality: "image",
    description: "Photorealistic rendering and seamless editing preservation.",
    endpoint: "nano-banana-pro",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9", "4:5", "3:4", "4:3"],
    resolutions: ["1024x1024", "1920x1080", "1080x1920"],
    defaultResolution: "1024x1024",
  },
  {
    id: "sd3-5-large",
    name: "Stable Diffusion 3.5 Large",
    provider: "Stability AI",
    modality: "image",
    description: "Multi-subject generation with superior prompt adherence.",
    endpoint: "sd3-5-large",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9", "4:5", "3:4", "4:3"],
    resolutions: ["1024x1024", "1280x720", "720x1280"],
    defaultResolution: "1024x1024",
  },
  {
    id: "midjourney-v6-style",
    name: "Cinematic Midjourney-v6 Style",
    provider: "Muapi / Recraft",
    modality: "image",
    description: "Hyper-stylized cinematic lighting, rich textures and atmospheric depth.",
    endpoint: "recraft-v3",
    aspectRatios: ["1:1", "16:9", "9:16", "21:9", "4:5"],
    resolutions: ["1024x1024", "1920x1080", "1080x1920"],
    defaultResolution: "1024x1024",
  },

  // ── Video Models ──
  {
    id: "self-hosted-comfy",
    name: "Self-hosted (ComfyUI)",
    provider: "LCS Self-hosted",
    modality: "video",
    description:
      "Zero marginal cost per call via your GPU/ComfyUI server. Used automatically for free-tier workspaces.",
    endpoint: "self-hosted",
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsCameraMotion: false,
    maxDurationSec: 10,
    resolutions: ["1280x720", "1920x1080"],
    defaultResolution: "1280x720",
  },
  {
    id: "minimax-hailuo",
    name: "Minimax Hailuo Video (H3)",
    provider: "Minimax",
    modality: "video",
    description: "Cinematic motion dynamics, physics simulation, and photorealistic humans.",
    endpoint: "minimax-h3-open-image-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 10,
    resolutions: ["1280x720", "1920x1080"],
    defaultResolution: "1280x720",
  },
  {
    id: "kling-2-0",
    name: "Kling AI 2.0 Pro",
    provider: "Kuaishou Kling",
    modality: "video",
    description: "High-framerate video generation with camera tracking and prompt accuracy.",
    endpoint: "kling-v3.0-pro-image-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 10,
    resolutions: ["1280x720", "1920x1080"],
    defaultResolution: "1280x720",
  },
  {
    id: "luma-dream-machine",
    name: "Luma Dream Machine",
    provider: "Luma AI",
    modality: "video",
    description: "Fluid character animation, realistic physics and dynamic camera moves.",
    endpoint: "luma-ray-2-image-to-video",
    aspectRatios: ["16:9", "9:16", "1:1", "21:9"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 8,
    resolutions: ["1280x720", "1920x1080"],
    defaultResolution: "1280x720",
  },
  {
    id: "wan-2-1",
    name: "Wan 2.1 14B Video",
    provider: "Wan-Video",
    modality: "video",
    description: "Open-weights foundation video model with vivid lighting and detail.",
    endpoint: "wan-2.1-t2v-14b",
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 6,
    resolutions: ["1280x720", "832x480"],
    defaultResolution: "1280x720",
  },
  {
    id: "runway-gen3",
    name: "Runway Gen-3 Alpha Turbo",
    provider: "RunwayML",
    modality: "video",
    description: "Ultra-high quality professional Hollywood cinematic generation.",
    endpoint: "runway-gen3-turbo",
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 10,
    resolutions: ["1280x720"],
    defaultResolution: "1280x720",
  },
  {
    id: "veo-2",
    name: "Google Veo 2",
    provider: "Google DeepMind",
    modality: "video",
    description: "High-definition video synthesis with natural camera physics.",
    endpoint: "veo-2-video",
    aspectRatios: ["16:9", "9:16"],
    supportsImageToVideo: true,
    supportsCameraMotion: true,
    maxDurationSec: 8,
    resolutions: ["1920x1080", "1280x720"],
    defaultResolution: "1920x1080",
  },

  // ── LipSync & Audio Models ──
  {
    id: "live-portrait-lipsync",
    name: "LivePortrait / SadTalker Pro",
    provider: "LivePortrait Engine",
    modality: "lipsync",
    description: "High-precision expressive facial animation and real-time lip synchronisation.",
    endpoint: "live-portrait-anim",
    aspectRatios: ["1:1", "9:16", "16:9"],
    supportsImageToVideo: true,
    supportsAudio: true,
    maxDurationSec: 30,
    resolutions: ["1024x1024", "1280x720"],
    defaultResolution: "1024x1024",
  },
  {
    id: "musicgen-audioldm",
    name: "MusicGen & SoundFX Studio",
    provider: "Meta AudioCraft",
    modality: "audio",
    description: "Generate original studio-quality soundtrack music and cinema sound effects.",
    endpoint: "musicgen-melody",
    aspectRatios: ["16:9"],
    supportsAudio: true,
    maxDurationSec: 60,
    defaultResolution: "audio-wav",
  },
];
