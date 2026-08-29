import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Workspace, WorkspaceDocument } from "./workspace.schema.js";
import { IsolationService } from "./isolation.service.js";
import { User, UserDocument } from "../users/user.schema.js";
import { CacheService } from "../cache/cache.service.js";

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
    @InjectModel(User.name) private users: Model<UserDocument>,
    @Inject(IsolationService) private isolation: IsolationService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async listForUser(userId: string) {
    const rows = await this.workspaces.find({ "members.userId": userId }).lean();
    return rows.map((w) => ({
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      monthlyBudgetCents: w.monthlyBudgetCents,
    }));
  }

  async create(userId: string, name: string) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Date.now().toString(36)}`;
    const ws = await this.workspaces.create({
      name,
      slug,
      members: [{ userId, role: "owner" }],
      monthlyBudgetCents: 50000,
    });
    await this.users.updateOne({ _id: userId }, { $addToSet: { workspaceIds: String(ws._id) } });
    return { id: String(ws._id), name: ws.name, slug: ws.slug };
  }

  async get(userId: string, workspaceId: string) {
    await this.isolation.assertWorkspaceMember(userId, workspaceId);
    const cacheKey = `ws-cfg:${workspaceId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const w = await this.workspaces.findById(workspaceId).lean();
    if (!w) throw new NotFoundException("Workspace no encontrado");
    const payload = {
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      monthlyBudgetCents: w.monthlyBudgetCents,
    };
    await this.cache.set(cacheKey, JSON.stringify(payload), 60);
    return payload;
  }
}
