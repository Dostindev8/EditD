import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workspace, WorkspaceSchema } from "./workspace.schema.js";
import { Project, ProjectSchema } from "../projects/project.schema.js";
import { User, UserSchema } from "../users/user.schema.js";
import { WorkspaceService } from "./workspace.service.js";
import { WorkspaceController } from "./workspace.controller.js";
import { IsolationService } from "./isolation.service.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, IsolationService],
  exports: [IsolationService, MongooseModule],
})
export class WorkspaceModule {}
