import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Project, ProjectSchema } from "./project.schema.js";
import { ProjectService } from "./project.service.js";
import { ProjectController } from "./project.controller.js";
import { WorkspaceModule } from "../workspaces/workspace.module.js";

@Module({
  imports: [
    WorkspaceModule,
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
