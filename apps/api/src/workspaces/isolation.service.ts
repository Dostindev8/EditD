import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Workspace, WorkspaceDocument } from "./workspace.schema.js";
import { Project, ProjectDocument } from "../projects/project.schema.js";
import { CacheService } from "../cache/cache.service.js";

@Injectable()
export class IsolationService {
  constructor(
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async assertWorkspaceMember(userId: string, workspaceId: string) {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new ForbiddenException("Workspace inválido");
    }
    const key = `ws-mem:${workspaceId}:${userId}`;
    const cached = await this.cache.get(key);
    if (cached === "1") return;
    const ws = await this.workspaces
      .findOne({
        _id: new Types.ObjectId(workspaceId),
        "members.userId": userId,
      })
      .lean();
    if (!ws) throw new ForbiddenException("Sin acceso a este workspace");
    await this.cache.set(key, "1", 30);
  }

  async getProjectInWorkspace(userId: string, workspaceId: string, projectId: string) {
    await this.assertWorkspaceMember(userId, workspaceId);
    if (!Types.ObjectId.isValid(projectId)) throw new NotFoundException("Proyecto no encontrado");
    const project = await this.projects
      .findOne({
        _id: new Types.ObjectId(projectId),
        workspaceId: new Types.ObjectId(workspaceId),
      })
      .lean();
    if (!project) throw new NotFoundException("Proyecto no encontrado");
    return project;
  }
}
