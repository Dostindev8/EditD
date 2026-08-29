import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AccessPayload } from "../auth/jwt.guard.js";
import { ProjectService } from "./project.service.js";
import { CreateProjectDto } from "../workspaces/workspace.dto.js";

@UseGuards(JwtGuard)
@Controller("workspaces/:workspaceId/projects")
export class ProjectController {
  constructor(@Inject(ProjectService) private projects: ProjectService) {}

  @Get()
  list(@CurrentUser() user: AccessPayload, @Param("workspaceId") workspaceId: string) {
    return this.projects.list(user.sub, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateProjectDto,
  ) {
    return this.projects.create(user.sub, workspaceId, body.name);
  }

  @Get(":projectId")
  get(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.projects.get(user.sub, workspaceId, projectId);
  }
}
