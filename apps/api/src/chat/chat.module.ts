import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ChatMessage, ChatMessageSchema } from "./chat-message.schema.js";
import { Workspace, WorkspaceSchema } from "../workspaces/workspace.schema.js";
import { ChatService } from "./chat.service.js";
import { ChatController } from "./chat.controller.js";
import { OrchestratorService } from "./orchestrator.service.js";
import { WorkspaceModule } from "../workspaces/workspace.module.js";
import { CreatorModule } from "../creator/creator.module.js";
import { GenerationModule } from "../generation/generation.module.js";
import { GovernanceModule } from "../governance/governance.module.js";

@Module({
  imports: [
    WorkspaceModule,
    CreatorModule,
    GenerationModule,
    GovernanceModule,
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, OrchestratorService],
})
export class ChatModule {}
