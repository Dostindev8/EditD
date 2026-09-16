import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BillingService } from "../billing/billing.service.js";
import { GovernanceService } from "../governance/governance.service.js";
import { IsolationService } from "../workspaces/isolation.service.js";
import { AssetService } from "../assets/asset.service.js";
import { RealtimeGateway } from "../realtime/realtime.gateway.js";
import type { VideoOption } from "../creator/creator.types.js";
import { GenerationJob, GenerationJobDocument } from "./generation-job.schema.js";
import { GenerationQueueService } from "./generation.queue.js";
import { DevMockProvider } from "./providers/dev-mock.provider.js";
import { SelfHostedProvider } from "./providers/selfhosted.provider.js";
import { FreeCloudProvider } from "./providers/free-cloud.provider.js";
import { RunwayProvider } from "./providers/runway.provider.js";
import { VeoProvider } from "./providers/veo.provider.js";
import { MuapiProvider } from "./providers/muapi.provider.js";
import { MinimaxProvider } from "./providers/minimax.provider.js";
import { LipSyncProvider } from "./providers/lipsync.provider.js";
import { AudioProvider } from "./providers/audio.provider.js";
import type {
  GenerationJobPublic,
  VideoGenerationPayload,
  VideoGenerationProvider,
} from "./generation.types.js";
import type { GenerationRequestPayload } from "@lcs/shared";
import { assertSafeExternalUrl } from "./url-safety.js";

@Injectable()
export class GenerationService implements OnModuleInit {
  private readonly log = new Logger(GenerationService.name);
  private providers: VideoGenerationProvider[] = [];

  constructor(
    @InjectModel(GenerationJob.name) private jobs: Model<GenerationJobDocument>,
    @Inject(BillingService) private billing: BillingService,
    @Inject(GovernanceService) private governance: GovernanceService,
    @Inject(IsolationService) private isolation: IsolationService,
    @Inject(AssetService) private assets: AssetService,
    @Inject(RealtimeGateway) private realtime: RealtimeGateway,
    @Inject(GenerationQueueService) private queue: GenerationQueueService,
    @Inject(RunwayProvider) private runway: RunwayProvider,
    @Inject(VeoProvider) private veo: VeoProvider,
    @Inject(MuapiProvider) private muapi: MuapiProvider,
    @Inject(MinimaxProvider) private minimax: MinimaxProvider,
    @Inject(LipSyncProvider) private lipsync: LipSyncProvider,
    @Inject(AudioProvider) private audio: AudioProvider,
    @Inject(SelfHostedProvider) private selfHosted: SelfHostedProvider,
    @Inject(FreeCloudProvider) private freeCloud: FreeCloudProvider,
    @Inject(DevMockProvider) private devMock: DevMockProvider,
  ) {}

  onModuleInit() {
    this.providers = [
      this.selfHosted,
      this.freeCloud,
      this.muapi,
      this.minimax,
      this.lipsync,
      this.audio,
      this.runway,
      this.veo,
      this.devMock,
    ];
    this.queue.registerHandler((jobId) => this.processJob(jobId));
  }

  /** Zero-marginal chain: local GPU → free cloud (Pollinations) → deterministic mock. */
  private pickZeroCostProvider(): VideoGenerationProvider {
    if (this.selfHosted.isConfigured()) return this.selfHosted;
    if (this.freeCloud.isConfigured()) return this.freeCloud;
    return this.devMock;
  }

  pickProvider(hasImage: boolean): VideoGenerationProvider {
    if (this.minimax.isConfigured()) return this.minimax;
    if (this.muapi.isConfigured()) return this.muapi;
    if (hasImage && this.runway.isConfigured()) return this.runway;
    if (this.veo.isConfigured()) return this.veo;
    return this.pickZeroCostProvider();
  }

  pickProviderForModality(
    modality?: string,
    modelId?: string,
    hasImage?: boolean,
  ): VideoGenerationProvider {
    if (modality === "lipsync") {
      return this.lipsync.isConfigured() ? this.lipsync : this.pickZeroCostProvider();
    }
    if (modality === "audio") {
      return this.audio.isConfigured() ? this.audio : this.pickZeroCostProvider();
    }
    if (modelId?.includes("self-hosted") || modelId?.includes("comfy") || modelId?.includes("local")) {
      return this.selfHosted.isConfigured() ? this.selfHosted : this.pickZeroCostProvider();
    }
    if (modelId?.includes("pollinations") || modelId?.includes("free-cloud")) {
      return this.pickZeroCostProvider();
    }
    if (modelId?.includes("minimax")) {
      if (this.minimax.isConfigured()) return this.minimax;
      if (this.muapi.isConfigured()) return this.muapi;
      return this.pickZeroCostProvider();
    }
    if (modality === "image" || modelId?.includes("flux") || modelId?.includes("nano") || modelId?.includes("sd3")) {
      if (this.muapi.isConfigured()) return this.muapi;
      return this.pickZeroCostProvider();
    }
    return this.pickProvider(Boolean(hasImage));
  }

  /**
   * Auditable provider selection:
   * - free-tier → self-hosted / free-cloud (zero $)
   * - paid-tier → paid keys when present; otherwise same zero-cost chain (never dead-end)
   */
  async resolveProviderForWorkspace(input: {
    workspaceId: string;
    modality?: string;
    modelId?: string;
    hasImage?: boolean;
  }): Promise<{ provider: VideoGenerationProvider; reason: string; freeTier: boolean }> {
    const monthlyBudgetCents = await this.governance.getWorkspaceMonthlyBudgetCents(
      input.workspaceId,
    );
    const freeTier = this.governance.isFreeTierBudget(monthlyBudgetCents);

    if (freeTier) {
      const provider = this.pickZeroCostProvider();
      const reason = `free-tier (monthlyBudgetCents=${monthlyBudgetCents} ≤ threshold=${this.governance.freeTierBudgetThresholdCents()}) → ${provider.name}`;
      this.log.log(`Provider routing: ${provider.name} (reason=${reason})`);
      return { provider, reason, freeTier: true };
    }

    const provider = this.pickProviderForModality(
      input.modality,
      input.modelId,
      input.hasImage,
    );
    const reason = `paid-tier (monthlyBudgetCents=${monthlyBudgetCents}) → ${provider.name}`;
    this.log.log(`Provider routing: ${provider.name} (reason=${reason})`);
    return { provider, reason, freeTier: this.isZeroMarginalCostProvider(provider.name) };
  }

  private isZeroMarginalCostProvider(name: string): boolean {
    return name === "self-hosted" || name === "free-cloud" || name === "dev-mock";
  }

  async enqueue(
    userId: string,
    input: {
      workspaceId: string;
      projectId: string;
      option: VideoOption;
      assetId?: string;
      locale?: "es" | "en";
    },
  ): Promise<{ job: GenerationJobPublic; budget: Awaited<ReturnType<GovernanceService["evaluateBudget"]>> }> {
    await this.isolation.getProjectInWorkspace(userId, input.workspaceId, input.projectId);

    const { provider } = await this.resolveProviderForWorkspace({
      workspaceId: input.workspaceId,
      hasImage: Boolean(input.assetId),
    });

    const rawCost = this.governance.estimateGenerationCostCents(
      input.option.durationSec,
      input.option.aspectRatio,
    );
    const actualEstimate = this.isZeroMarginalCostProvider(provider.name) ? 0 : rawCost;
    const budget = await this.governance.evaluateBudget({
      workspaceId: input.workspaceId,
      estimatedCostCents: actualEstimate,
      locale: input.locale,
    });

    if (!budget.allowed) {
      throw new ForbiddenException(budget.reason);
    }

    const doc = await this.jobs.create({
      workspaceId: new Types.ObjectId(input.workspaceId),
      projectId: new Types.ObjectId(input.projectId),
      userId,
      status: "queued",
      progress: 0,
      provider: provider.name,
      costCents: actualEstimate,
      prompt: input.option.prompt,
      optionSnapshot: input.option as unknown as Record<string, unknown>,
      assetId: input.assetId,
    });

    const jobId = String(doc._id);
    const publicJob = this.toPublic(doc);

    this.realtime.emitGenerationEvent(input.workspaceId, input.projectId, "job:encolado", {
      jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      status: "queued",
      progress: 0,
      provider: provider.name,
      costCents: actualEstimate,
    });

    await this.billing.recordGenerationJob({
      id: jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      userId,
      provider: provider.name,
      status: "queued",
      costCents: 0,
      prompt: input.option.prompt,
    });

    await this.queue.enqueue(jobId);

    return { job: publicJob, budget };
  }

  async enqueueDirect(
    userId: string,
    input: {
      workspaceId: string;
      projectId: string;
      payload: GenerationRequestPayload;
      assetId?: string;
      locale?: "es" | "en";
    },
  ): Promise<{ job: GenerationJobPublic; budget: Awaited<ReturnType<GovernanceService["evaluateBudget"]>> }> {
    await this.isolation.getProjectInWorkspace(userId, input.workspaceId, input.projectId);

    // Fail closed before enqueue — client-supplied media URLs must not SSRF the worker.
    const safeSource = await assertSafeExternalUrl(input.payload.sourceImageUrl, "sourceImageUrl");
    const safeEnd = await assertSafeExternalUrl(input.payload.endImageUrl, "endImageUrl");
    const safeAudio = await assertSafeExternalUrl(input.payload.sourceAudioUrl, "sourceAudioUrl");
    input.payload = {
      ...input.payload,
      sourceImageUrl: safeSource,
      endImageUrl: safeEnd,
      sourceAudioUrl: safeAudio,
    };

    const { provider } = await this.resolveProviderForWorkspace({
      workspaceId: input.workspaceId,
      modality: input.payload.modality,
      modelId: input.payload.modelId,
      hasImage: Boolean(input.assetId || input.payload.sourceImageUrl),
    });

    const durationSec = input.payload.durationSec || (input.payload.modality === "image" ? 0 : 10);
    const rawCost = this.governance.estimateGenerationCostCents(
      durationSec,
      input.payload.aspectRatio,
    );
    const actualEstimate = this.isZeroMarginalCostProvider(provider.name) ? 0 : rawCost;

    const budget = await this.governance.evaluateBudget({
      workspaceId: input.workspaceId,
      estimatedCostCents: actualEstimate,
      locale: input.locale,
    });

    if (!budget.allowed) {
      throw new ForbiddenException(budget.reason);
    }

    const doc = await this.jobs.create({
      workspaceId: new Types.ObjectId(input.workspaceId),
      projectId: new Types.ObjectId(input.projectId),
      userId,
      status: "queued",
      progress: 0,
      provider: provider.name,
      costCents: actualEstimate,
      prompt: input.payload.prompt,
      optionSnapshot: input.payload as unknown as Record<string, unknown>,
      assetId: input.assetId,
    });

    const jobId = String(doc._id);
    const publicJob = this.toPublic(doc);

    this.realtime.emitGenerationEvent(input.workspaceId, input.projectId, "job:encolado", {
      jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      status: "queued",
      progress: 0,
      provider: provider.name,
      costCents: actualEstimate,
    });

    await this.billing.recordGenerationJob({
      id: jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      userId,
      provider: provider.name,
      status: "queued",
      costCents: 0,
      prompt: input.payload.prompt,
    });

    await this.queue.enqueue(jobId);

    return { job: publicJob, budget };
  }

  async getJob(userId: string, workspaceId: string, projectId: string, jobId: string) {
    await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    const doc = await this.jobs.findOne({
      _id: new Types.ObjectId(jobId),
      workspaceId: new Types.ObjectId(workspaceId),
      projectId: new Types.ObjectId(projectId),
    });
    if (!doc) throw new NotFoundException("Generation job not found");
    return this.toPublic(doc);
  }

  async handleWebhook(
    provider: "runway" | "veo",
    externalJobId: string,
    payload: { status?: string; outputUrl?: string; error?: string },
  ) {
    const doc = await this.jobs.findOne({ externalJobId, provider });
    if (!doc) {
      this.log.warn(`Webhook ${provider} unknown job ${externalJobId}`);
      return;
    }

    const wsId = String(doc.workspaceId);
    const projId = String(doc.projectId);
    const jobId = String(doc._id);

    if (payload.status === "completed" && payload.outputUrl) {
      doc.status = "completed";
      doc.progress = 100;
      doc.outputUrl = payload.outputUrl;
      await doc.save();
      await this.finalizeJob(doc, jobId, wsId, projId);
      return;
    }

    if (payload.status === "failed") {
      doc.status = "failed";
      doc.errorMessage = payload.error ?? "Provider reported failure";
      await doc.save();
      this.realtime.emitGenerationEvent(wsId, projId, "job:failed", {
        jobId,
        error: doc.errorMessage,
      });
    }
  }

  private async processJob(jobId: string) {
    const doc = await this.jobs.findById(jobId);
    if (!doc || doc.status === "completed" || doc.status === "failed") return;

    const wsId = String(doc.workspaceId);
    const projId = String(doc.projectId);
    const provider = this.providers.find((p) => p.name === doc.provider) ?? this.devMock;

    doc.status = "processing";
    doc.progress = 5;
    await doc.save();
    this.realtime.emitGenerationEvent(wsId, projId, "job:progress", {
      jobId,
      status: "processing",
      progress: 5,
    });

    let assetUrl: string | undefined;
    if (doc.assetId) {
      try {
        const asset = await this.assets.get(doc.userId, wsId, doc.assetId);
        const base = process.env.API_PUBLIC_URL ?? "http://localhost:4000";
        assetUrl = `${base}${asset.url}`;
      } catch {
        /* text-only */
      }
    }

    const snapshot = (doc.optionSnapshot || {}) as unknown as Record<string, unknown>;
    let safeSource: string | undefined;
    let safeEnd: string | undefined;
    let safeAudio: string | undefined;
    try {
      safeSource = await assertSafeExternalUrl(
        snapshot.sourceImageUrl as string | undefined,
        "sourceImageUrl",
      );
      safeEnd = await assertSafeExternalUrl(
        snapshot.endImageUrl as string | undefined,
        "endImageUrl",
      );
      safeAudio = await assertSafeExternalUrl(
        snapshot.sourceAudioUrl as string | undefined,
        "sourceAudioUrl",
      );
    } catch (e) {
      await this.failJob(doc, jobId, wsId, projId, (e as Error).message);
      return;
    }

    const payload: VideoGenerationPayload = {
      prompt: doc.prompt,
      aspectRatio: String(snapshot.aspectRatio ?? "16:9"),
      durationSec: Number(snapshot.durationSec ?? 10),
      assetUrl: safeSource || assetUrl,
      endImageUrl: safeEnd,
      audioUrl: safeAudio,
      modality: snapshot.modality as any,
      modelId: snapshot.modelId as string,
      cameraMotion: snapshot.cameraMotion as any,
      negativePrompt: snapshot.negativePrompt as string,
      quality: snapshot.quality as any,
      steps: snapshot.steps as number,
      cfgScale: snapshot.cfgScale as number,
      seed: snapshot.seed as number,
    };

    try {
      const submitted = await provider.submit(payload);
      doc.externalJobId = submitted.externalJobId;
      doc.provider = submitted.provider;
      await doc.save();
    } catch (e) {
      await this.failJob(doc, jobId, wsId, projId, (e as Error).message);
      return;
    }

    const deadline = Date.now() + Number(process.env.GENERATION_POLL_TIMEOUT_MS ?? 180000);
    while (Date.now() < deadline) {
      const poll = await provider.poll(doc.externalJobId!);
      if (poll.progress > doc.progress) {
        doc.progress = poll.progress;
        await doc.save();
        this.realtime.emitGenerationEvent(wsId, projId, "job:progress", {
          jobId,
          status: "processing",
          progress: poll.progress,
        });
      }

      if (poll.status === "completed" && poll.outputUrl) {
        doc.status = "completed";
        doc.progress = 100;
        doc.outputUrl = poll.outputUrl;
        doc.costCents = poll.actualCostCents ?? doc.costCents;
        await doc.save();
        await this.finalizeJob(doc, jobId, wsId, projId);
        return;
      }

      if (poll.status === "failed") {
        await this.failJob(doc, jobId, wsId, projId, poll.errorMessage ?? "Provider failure");
        return;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    await this.failJob(doc, jobId, wsId, projId, "Generation timed out after polling deadline");
  }

  private async finalizeJob(
    doc: GenerationJobDocument,
    jobId: string,
    workspaceId: string,
    projectId: string,
  ) {
    this.realtime.emitGenerationEvent(workspaceId, projectId, "job:completed", {
      jobId,
      status: "completed",
      progress: 100,
      outputUrl: doc.outputUrl,
      costCents: doc.costCents,
    });

    await this.billing.recordGenerationJob({
      id: jobId,
      workspaceId,
      projectId,
      userId: doc.userId,
      provider: doc.provider,
      status: "completed",
      costCents: doc.costCents,
      prompt: doc.prompt,
    });
  }

  private async failJob(
    doc: GenerationJobDocument,
    jobId: string,
    workspaceId: string,
    projectId: string,
    reason: string,
  ) {
    doc.status = "failed";
    doc.errorMessage = reason;
    await doc.save();

    this.realtime.emitGenerationEvent(workspaceId, projectId, "job:failed", {
      jobId,
      error: reason,
    });

    await this.billing.recordGenerationJob({
      id: jobId,
      workspaceId,
      projectId,
      userId: doc.userId,
      provider: doc.provider,
      status: "failed",
      costCents: 0,
      prompt: doc.prompt,
    });
  }

  private toPublic(doc: GenerationJobDocument): GenerationJobPublic {
    return {
      id: String(doc._id),
      workspaceId: String(doc.workspaceId),
      projectId: String(doc.projectId),
      status: doc.status,
      progress: doc.progress,
      provider: doc.provider,
      costCents: doc.costCents,
      outputUrl: doc.outputUrl,
      errorMessage: doc.errorMessage,
      createdAt: (doc as any).createdAt,
    };
  }
}
