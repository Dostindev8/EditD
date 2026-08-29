import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true, collection: "chat_messages" })
export class ChatMessage {
  @Prop({ required: true, type: Types.ObjectId })
  workspaceId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  projectId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: ["user", "assistant", "system"] })
  role!: string;

  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: String })
  assetId?: string;

  @Prop({ type: Object })
  toolTrace?: Record<string, unknown>;
}

export type ChatMessageDocument = HydratedDocument<ChatMessage>;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ workspaceId: 1, projectId: 1, createdAt: 1 });
