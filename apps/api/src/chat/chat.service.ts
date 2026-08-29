import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ChatMessage, ChatMessageDocument } from "./chat-message.schema.js";
import { IsolationService } from "../workspaces/isolation.service.js";
import { OrchestratorService } from "./orchestrator.service.js";
import type { SendMessageDto } from "./chat.dto.js";

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private messages: Model<ChatMessageDocument>,
    @Inject(IsolationService) private isolation: IsolationService,
    @Inject(OrchestratorService) private orchestrator: OrchestratorService,
  ) {}

  async history(userId: string, workspaceId: string, projectId: string) {
    await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    const rows = await this.messages
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        projectId: new Types.ObjectId(projectId),
      })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
    return rows.map((m) => ({
      id: String(m._id),
      role: m.role,
      content: m.content,
      assetId: m.assetId,
      toolTrace: m.toolTrace,
      createdAt: (m as { createdAt?: Date }).createdAt,
    }));
  }

  async send(
    userId: string,
    workspaceId: string,
    projectId: string,
    content: string,
    opts?: {
      assetId?: string;
      selectedOptionId?: string;
      selectedOption?: SendMessageDto["selectedOption"];
      generateVideo?: boolean;
      locale?: "es" | "en";
    },
  ) {
    await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    await this.messages.create({
      workspaceId: new Types.ObjectId(workspaceId),
      projectId: new Types.ObjectId(projectId),
      userId,
      role: "user",
      content,
      assetId: opts?.assetId,
    });
    const hist = await this.messages
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        projectId: new Types.ObjectId(projectId),
        role: { $in: ["user", "assistant"] },
      })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();
    const history = hist.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const reply = await this.orchestrator.reply({
      workspaceId,
      projectId,
      userId,
      userMessage: content,
      history,
      assetId: opts?.assetId,
      selectedOptionId: opts?.selectedOptionId,
      selectedOption: opts?.selectedOption,
      generateVideo: opts?.generateVideo,
      locale: opts?.locale ?? "es",
    });
    const saved = await this.messages.create({
      workspaceId: new Types.ObjectId(workspaceId),
      projectId: new Types.ObjectId(projectId),
      userId,
      role: "assistant",
      content: reply.text,
      toolTrace: reply.toolTrace,
    });
    return {
      id: String(saved._id),
      role: "assistant",
      content: reply.text,
      toolTrace: reply.toolTrace,
    };
  }
}
