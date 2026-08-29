import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "./project.schema.js";
import { IsolationService } from "../workspaces/isolation.service.js";

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
    @Inject(IsolationService) private isolation: IsolationService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.isolation.assertWorkspaceMember(userId, workspaceId);
    const rows = await this.projects
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .lean();
    return rows.map((p) => ({
      id: String(p._id),
      workspaceId: String(p.workspaceId),
      name: p.name,
      assetIds: p.assetIds,
    }));
  }

  async create(userId: string, workspaceId: string, name: string) {
    await this.isolation.assertWorkspaceMember(userId, workspaceId);
    const p = await this.projects.create({
      workspaceId: new Types.ObjectId(workspaceId),
      name,
      assetIds: [],
    });
    return { id: String(p._id), workspaceId, name: p.name, assetIds: [] };
  }

  async get(userId: string, workspaceId: string, projectId: string) {
    const p = await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    return {
      id: String(p._id),
      workspaceId: String(p.workspaceId),
      name: p.name,
      assetIds: p.assetIds,
    };
  }
}
