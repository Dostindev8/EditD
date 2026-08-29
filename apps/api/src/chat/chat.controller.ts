import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtGuard } from "../auth/jwt.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AccessPayload } from "../auth/jwt.guard.js";
import { ChatService } from "./chat.service.js";
import { SendMessageDto } from "./chat.dto.js";

@UseGuards(JwtGuard)
@Controller("workspaces/:workspaceId/projects/:projectId/chat")
export class ChatController {
  constructor(@Inject(ChatService) private chat: ChatService) {}

  @Get()
  history(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.chat.history(user.sub, workspaceId, projectId);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post()
  send(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.chat.send(user.sub, workspaceId, projectId, body.content, {
      assetId: body.assetId,
      selectedOptionId: body.selectedOptionId,
      selectedOption: body.selectedOption,
      generateVideo: body.generateVideo,
      locale: body.locale,
    });
  }
}
