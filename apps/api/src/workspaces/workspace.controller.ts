import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AccessPayload } from "../auth/jwt.guard.js";
import { WorkspaceService } from "./workspace.service.js";
import { CreateWorkspaceDto } from "./workspace.dto.js";

@UseGuards(JwtGuard)
@Controller("workspaces")
export class WorkspaceController {
  constructor(@Inject(WorkspaceService) private workspaces: WorkspaceService) {}

  @Get()
  list(@CurrentUser() user: AccessPayload) {
    return this.workspaces.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AccessPayload, @Body() body: CreateWorkspaceDto) {
    return this.workspaces.create(user.sub, body.name);
  }

  @Get(":id")
  get(@CurrentUser() user: AccessPayload, @Param("id") id: string) {
    return this.workspaces.get(user.sub, id);
  }
}
