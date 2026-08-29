import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workspace, WorkspaceSchema } from "../workspaces/workspace.schema.js";
import { GovernanceService } from "./governance.service.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }]),
  ],
  providers: [GovernanceService],
  exports: [GovernanceService],
})
export class GovernanceModule {}
