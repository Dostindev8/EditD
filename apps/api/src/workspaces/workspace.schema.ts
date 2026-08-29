import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type MemberRole = "owner" | "editor" | "viewer";

@Schema({ _id: false })
export class WorkspaceMember {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: ["owner", "editor", "viewer"] })
  role!: MemberRole;
}

export const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

@Schema({ timestamps: true, collection: "workspaces" })
export class Workspace {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true })
  slug!: string;

  @Prop({ type: [WorkspaceMemberSchema], default: [] })
  members!: WorkspaceMember[];

  @Prop({ type: Number, default: 50000 })
  monthlyBudgetCents!: number;
}

export type WorkspaceDocument = HydratedDocument<Workspace>;
export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
WorkspaceSchema.index({ "members.userId": 1 });
