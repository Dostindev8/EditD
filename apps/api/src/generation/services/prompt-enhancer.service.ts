import { Injectable } from "@nestjs/common";
import type { CameraMotionConfig } from "@lcs/shared";

export interface PromptEnhanceOptions {
  prompt: string;
  style?: string;
  cameraMotion?: CameraMotionConfig;
  aspectRatio?: string;
  lighting?: string;
  mood?: string;
}

@Injectable()
export class PromptEnhancerService {
  private readonly STYLE_MODIFIERS: Record<string, string> = {
    cinematic: "cinematic 35mm photograph, ARRI Alexa LF, Master Anamorphic lens, volumetric atmospheric dust, photorealistic color grading",
    cyberpunk: "futuristic cyberpunk aesthetic, neon reflections, wet asphalt, high-tech holograms, blade runner atmosphere, hyper-detailed",
    fantasy: "high fantasy epic concept art, intricate magical runes, unreal engine 5 render, octane render, vivid illumination",
    anime: "makoto shinkai style, high quality anime screencap, studio ghibli lighting, vibrant colors, detailed sky and clouds",
    noir: "classic 1940s film noir, dramatic chiaroscuro lighting, deep shadows, smoke and rain, high contrast monochrome with subtle green tint",
    hyperrealism: "8k ultra-detailed RAW photograph, Hasselblad H6D-100c, sharp focus, natural subsurface scattering, award-winning photography",
  };

  private readonly CAMERA_DESCRIPTIONS: Record<string, string> = {
    pan_left: "smooth camera panning left across the scene",
    pan_right: "sweeping camera pan to the right",
    tilt_up: "dynamic low angle tilt up revealing the full height and scale",
    tilt_down: "smooth top-down tilt revealing the ground textures",
    zoom_in: "dramatic slow optical zoom-in towards the focal subject",
    zoom_out: "cinematic pull-out zoom establishing the vast environment",
    dolly_in: "smooth steadicam dolly-in tracking the subject motion",
    orbit_left: "dynamic circular orbit around the central character",
    fpv_drone: "ultra-high speed FPV cinematic drone dive with motion blur",
  };

  enhancePrompt(options: PromptEnhanceOptions): { enhancedPrompt: string; negativePrompt: string } {
    const raw = options.prompt.trim();
    const styleKey = (options.style || "cinematic").toLowerCase();
    const styleMod = this.STYLE_MODIFIERS[styleKey] || this.STYLE_MODIFIERS.cinematic;

    let cameraDesc = "";
    if (options.cameraMotion && options.cameraMotion.type !== "static") {
      cameraDesc = `, ${this.CAMERA_DESCRIPTIONS[options.cameraMotion.type] || options.cameraMotion.type}`;
      if (options.cameraMotion.lightingStyle) {
        cameraDesc += `, ${options.cameraMotion.lightingStyle.replace(/_/g, " ")} lighting`;
      }
    }

    const enhancedPrompt = `${raw}, ${styleMod}${cameraDesc}, 8k resolution, photorealistic, masterpiece`.replace(/,\s*,/g, ", ");
    const negativePrompt = "blurry, low quality, distorted anatomy, extra limbs, bad hands, artifacts, watermark, logo, text, cropped, low resolution";

    return { enhancedPrompt, negativePrompt };
  }
}
