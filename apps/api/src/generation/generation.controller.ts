import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtGuard } from "../auth/jwt.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { GenerationService } from "./generation.service.js";
import { PromptEnhancerService } from "./services/prompt-enhancer.service.js";
import { ModelCatalogService } from "./services/model-catalog.service.js";
import { verifyWebhookHmac } from "./webhook.util.js";
import type { GenerationRequestPayload } from "@lcs/shared";

@Controller()
export class GenerationController {
  constructor(
    @Inject(GenerationService) private generation: GenerationService,
    @Inject(PromptEnhancerService) private promptEnhancer: PromptEnhancerService,
    @Inject(ModelCatalogService) private catalog: ModelCatalogService,
  ) {}

  @Get("generation/catalog")
  getCatalog(@Query("modality") modality?: string) {
    if (modality) {
      return this.catalog.getModelsByModality(modality);
    }
    return this.catalog.getCatalog();
  }

  @Post("generation/enhance-prompt")
  enhancePrompt(
    @Body()
    body: {
      prompt: string;
      style?: string;
      cameraMotion?: any;
      aspectRatio?: string;
    },
  ) {
    return this.promptEnhancer.enhancePrompt(body);
  }

  @UseGuards(JwtGuard)
  @Post("workspaces/:workspaceId/projects/:projectId/generation/direct")
  enqueueDirect(
    @CurrentUser() user: { sub: string },
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body()
    body: {
      payload: GenerationRequestPayload;
      assetId?: string;
      locale?: "es" | "en";
    },
  ) {
    return this.generation.enqueueDirect(user.sub, {
      workspaceId,
      projectId,
      payload: body.payload,
      assetId: body.assetId,
      locale: body.locale,
    });
  }

  @UseGuards(JwtGuard)
  @Get("workspaces/:workspaceId/projects/:projectId/generation/:jobId")
  getJob(
    @CurrentUser() user: { sub: string },
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Param("jobId") jobId: string,
  ) {
    return this.generation.getJob(user.sub, workspaceId, projectId, jobId);
  }

  @Post("generation/webhooks/runway")
  runwayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-signature") signature: string | undefined,
    @Body() body: { task_id?: string; id?: string; status?: string; output?: string[]; failure?: string },
  ) {
    if (!verifyWebhookHmac(req.rawBody, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
    const externalJobId = body.task_id ?? body.id;
    if (!externalJobId) return { ok: false };
    const st = (body.status ?? "").toLowerCase();
    void this.generation.handleWebhook("runway", externalJobId, {
      status: st === "succeeded" || st === "completed" ? "completed" : st === "failed" ? "failed" : "processing",
      outputUrl: body.output?.[0],
      error: body.failure,
    });
    return { ok: true };
  }

  @Post("generation/webhooks/veo")
  veoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-signature") signature: string | undefined,
    @Body()
    body: {
      name?: string;
      done?: boolean;
      error?: { message?: string };
      response?: { generatedVideos?: Array<{ uri?: string }> };
    },
  ) {
    if (!verifyWebhookHmac(req.rawBody, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
    const externalJobId = body.name;
    if (!externalJobId) return { ok: false };
    void this.generation.handleWebhook("veo", externalJobId, {
      status: body.error ? "failed" : body.done ? "completed" : "processing",
      outputUrl: body.response?.generatedVideos?.[0]?.uri,
      error: body.error?.message,
    });
    return { ok: true };
  }
}
