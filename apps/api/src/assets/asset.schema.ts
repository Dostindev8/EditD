import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true, collection: "assets" })
export class Asset {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  workspaceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  filename!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: String, required: true })
  storagePath!: string;

  @Prop({ type: Number })
  sizeBytes?: number;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;
}

export type AssetDocument = HydratedDocument<Asset>;
export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ workspaceId: 1, projectId: 1 });
