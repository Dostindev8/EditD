import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GenerationJob, GenerationJobSchema } from "./generation-job.schema.js";
import { GenerationService } from "./generation.service.js";
import { GenerationController } from "./generation.controller.js";
import { GenerationQueueService } from "./generation.queue.js";
import { GovernanceModule } from "../governance/governance.module.js";
import { WorkspaceModule } from "../workspaces/workspace.module.js";
import { AssetModule } from "../assets/asset.module.js";
import { RunwayProvider } from "./providers/runway.provider.js";
import { VeoProvider } from "./providers/veo.provider.js";
import { MuapiProvider } from "./providers/muapi.provider.js";
import { MinimaxProvider } from "./providers/minimax.provider.js";
import { LipSyncProvider } from "./providers/lipsync.provider.js";
import { AudioProvider } from "./providers/audio.provider.js";
import { DevMockProvider } from "./providers/dev-mock.provider.js";
import { PromptEnhancerService } from "./services/prompt-enhancer.service.js";
import { ModelCatalogService } from "./services/model-catalog.service.js";

@Module({
  imports: [
    GovernanceModule,
    WorkspaceModule,
    AssetModule,
    MongooseModule.forFeature([{ name: GenerationJob.name, schema: GenerationJobSchema }]),
  ],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    GenerationQueueService,
    PromptEnhancerService,
    ModelCatalogService,
    MuapiProvider,
    MinimaxProvider,
    LipSyncProvider,
    AudioProvider,
    RunwayProvider,
    VeoProvider,
    DevMockProvider,
  ],
  exports: [GenerationService, PromptEnhancerService, ModelCatalogService],
})
export class GenerationModule {}
