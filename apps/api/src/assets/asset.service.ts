import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Asset, AssetDocument } from "./asset.schema.js";
import { detectImageMime, MAX_UPLOAD_BYTES } from "./file-validation.js";
import { IsolationService } from "../workspaces/isolation.service.js";

@Injectable()
export class AssetService {
  private uploadDir = join(process.cwd(), "uploads");

  constructor(
    @InjectModel(Asset.name) private assets: Model<AssetDocument>,
    @Inject(IsolationService) private isolation: IsolationService,
  ) {
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  async upload(
    userId: string,
    workspaceId: string,
    projectId: string,
    file: Express.Multer.File,
  ) {
    await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    if (!file?.buffer?.length) throw new BadRequestException("Archivo vacío");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Máximo 5 MB por imagen");
    }
    const mime = detectImageMime(file.buffer);
    if (!mime) throw new BadRequestException("Solo imágenes JPG, PNG, WebP o GIF");

    const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
    const stored = `${randomUUID()}.${ext}`;
    const storagePath = join(this.uploadDir, stored);
    writeFileSync(storagePath, file.buffer);

    const doc = await this.assets.create({
      workspaceId: new Types.ObjectId(workspaceId),
      projectId: new Types.ObjectId(projectId),
      userId,
      filename: file.originalname.slice(0, 120) || stored,
      mimeType: mime,
      storagePath,
      sizeBytes: file.size,
    });

    return this.toSummary(doc, workspaceId);
  }

  async get(userId: string, workspaceId: string, assetId: string) {
    await this.isolation.assertWorkspaceMember(userId, workspaceId);
    const a = await this.assets
      .findOne({
        _id: new Types.ObjectId(assetId),
        workspaceId: new Types.ObjectId(workspaceId),
      })
      .lean();
    if (!a) throw new NotFoundException("Asset no encontrado");
    return this.toSummary(a, workspaceId);
  }

  async list(userId: string, workspaceId: string, projectId: string) {
    await this.isolation.getProjectInWorkspace(userId, workspaceId, projectId);
    const rows = await this.assets
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        projectId: new Types.ObjectId(projectId),
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return rows.map((r) => this.toSummary(r, workspaceId));
  }

  async resolveFile(assetId: string, workspaceId: string, userId: string) {
    await this.isolation.assertWorkspaceMember(userId, workspaceId);
    const a = await this.assets
      .findOne({
        _id: new Types.ObjectId(assetId),
        workspaceId: new Types.ObjectId(workspaceId),
      })
      .lean();
    if (!a) throw new NotFoundException("Asset no encontrado");
    return { path: a.storagePath, mime: a.mimeType };
  }

  private toSummary(a: AssetDocument | Record<string, unknown>, workspaceId: string) {
    const id = String((a as { _id: unknown })._id);
    return {
      id,
      filename: (a as Asset).filename,
      mimeType: (a as Asset).mimeType,
      url: `/api/workspaces/assets/${id}/file?workspaceId=${workspaceId}`,
      sizeBytes: (a as Asset).sizeBytes,
    };
  }
}
