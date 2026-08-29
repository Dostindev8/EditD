import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AspectRatio, VideoOption } from "../creator/creator.types.js";
import { AssetService } from "../assets/asset.service.js";

type ProposeInput = {
  workspaceId: string;
  projectId: string;
  userMessage: string;
  assetId?: string;
  locale?: "es" | "en";
};

@Injectable()
export class CreatorService {
  constructor(@Inject(AssetService) private assets: AssetService) {}

  async proposeVideoOptions(
    userId: string,
    input: ProposeInput,
  ): Promise<{ options: VideoOption[]; hasImage: boolean; assetFilename?: string }> {
    const locale = input.locale ?? "es";
    let hasImage = false;
    let assetFilename: string | undefined;

    if (input.assetId) {
      try {
        const asset = await this.assets.get(userId, input.workspaceId, input.assetId);
        hasImage = true;
        assetFilename = asset.filename;
      } catch {
        /* text-only */
      }
    }

    const msg = input.userMessage.toLowerCase();
    const isReels =
      msg.includes("instagram") ||
      msg.includes("reel") ||
      msg.includes("tiktok") ||
      msg.includes("vertical");
    const isSquare = msg.includes("cuadrado") || msg.includes("square") || msg.includes("feed");
    const isCinematic =
      msg.includes("youtube") ||
      msg.includes("cinematic") ||
      msg.includes("película") ||
      msg.includes("film");

    const baseSubject = input.userMessage.trim().slice(0, 200) || (locale === "es" ? "tu contenido" : "your content");
    const imageNote = hasImage
      ? locale === "es"
        ? ` usando la imagen "${assetFilename}" como ancla visual`
        : ` using image "${assetFilename}" as visual anchor`
      : "";

    const templates: Omit<VideoOption, "id">[] = [
      {
        title: locale === "es" ? "Reels / TikTok — dinámico" : "Reels / TikTok — dynamic",
        description:
          locale === "es"
            ? `Vertical 9:16, ritmo rápido para redes${imageNote}.`
            : `Vertical 9:16, fast pace for social${imageNote}.`,
        aspectRatio: "9:16" as AspectRatio,
        durationSec: 15,
        style: locale === "es" ? "Moderno esmeralda, alto contraste" : "Modern emerald, high contrast",
        cameraMovement: locale === "es" ? "Push-in suave + paneo lateral" : "Soft push-in + lateral pan",
        platform: "Instagram Reels / TikTok",
        estimatedCostCents: 0,
        prompt: `[9:16|15s] Subject: ${baseSubject}${imageNote}. Camera: slow push-in, lateral pan. Lighting: golden hour, emerald accent. Rhythm: fast cuts every 2s.`,
      },
      {
        title: locale === "es" ? "Feed cuadrado — elegante" : "Square feed — elegant",
        description:
          locale === "es"
            ? `Formato 1:1 ideal para feed y anuncios${imageNote}.`
            : `1:1 format for feed and ads${imageNote}.`,
        aspectRatio: "1:1" as AspectRatio,
        durationSec: 20,
        style: locale === "es" ? "Luxury/soft obsidiana + plata" : "Luxury/soft obsidian + silver",
        cameraMovement: locale === "es" ? "Ken Burns lento, sin shake" : "Slow Ken Burns, no shake",
        platform: "Instagram / Facebook Feed",
        estimatedCostCents: 0,
        prompt: `[1:1|20s] Subject: ${baseSubject}${imageNote}. Camera: Ken Burns slow zoom. Lighting: soft diffused, chrome highlights. Rhythm: calm, 3s holds.`,
      },
      {
        title: locale === "es" ? "YouTube / Web — cinematográfico" : "YouTube / Web — cinematic",
        description:
          locale === "es"
            ? `Horizontal 16:9 con narrativa visual${imageNote}.`
            : `Horizontal 16:9 with visual narrative${imageNote}.`,
        aspectRatio: "16:9" as AspectRatio,
        durationSec: 30,
        style: locale === "es" ? "Cinematográfico, profundidad de campo" : "Cinematic, depth of field",
        cameraMovement: locale === "es" ? "Travelling lateral + tilt up" : "Lateral dolly + tilt up",
        platform: "YouTube / Web / Presentaciones",
        estimatedCostCents: 0,
        prompt: `[16:9|30s] Subject: ${baseSubject}${imageNote}. Camera: lateral dolly, tilt up reveal. Lighting: cinematic dusk, emerald glow. Rhythm: narrative arc, 5s scenes.`,
      },
    ];

    // Reorder based on user intent
    let ordered = templates;
    if (isReels) ordered = [templates[0], templates[2], templates[1]];
    else if (isSquare) ordered = [templates[1], templates[0], templates[2]];
    else if (isCinematic) ordered = [templates[2], templates[1], templates[0]];

    const options: VideoOption[] = ordered.map((t) => ({ ...t, id: randomUUID() }));

    return { options, hasImage, assetFilename };
  }
}
