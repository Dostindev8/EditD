export type AspectRatio = "9:16" | "1:1" | "16:9";

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
