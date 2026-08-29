import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

@Schema({ timestamps: true, collection: "generation_jobs" })
export class GenerationJob {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  workspaceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: ["queued", "processing", "completed", "failed"] })
  status!: GenerationStatus;

  @Prop({ type: Number, default: 0 })
  progress!: number;

  @Prop({ type: String, required: true })
  provider!: string;

  @Prop({ type: Number, default: 0 })
  costCents!: number;

  @Prop({ type: String, required: true })
  prompt!: string;

  @Prop({ type: Object, required: true })
  optionSnapshot!: Record<string, unknown>;

  @Prop({ type: String })
  assetId?: string;

  @Prop({ type: String })
  outputUrl?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String })
  externalJobId?: string;
}

export type GenerationJobDocument = HydratedDocument<GenerationJob>;
export const GenerationJobSchema = SchemaFactory.createForClass(GenerationJob);
GenerationJobSchema.index({ workspaceId: 1, projectId: 1, createdAt: -1 });
