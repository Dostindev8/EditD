import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { createReadStream, existsSync } from "node:fs";
import { JwtGuard } from "../auth/jwt.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AccessPayload } from "../auth/jwt.guard.js";
import { AssetService } from "./asset.service.js";
import { memoryStorage } from "multer";

@UseGuards(JwtGuard)
@Controller("workspaces/:workspaceId/projects/:projectId/assets")
export class AssetController {
  constructor(@Inject(AssetService) private assets: AssetService) {}

  @Get()
  list(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.assets.list(user.sub, workspaceId, projectId);
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: AccessPayload,
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.assets.upload(user.sub, workspaceId, projectId, file);
  }
}

@UseGuards(JwtGuard)
@Controller("workspaces/assets")
export class AssetFileController {
  constructor(@Inject(AssetService) private assets: AssetService) {}

  @Get(":assetId/file")
  async file(
    @CurrentUser() user: AccessPayload,
    @Param("assetId") assetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const workspaceId = (req.query.workspaceId as string) || "";
    if (!workspaceId) return res.status(400).send("workspaceId required");
    const { path, mime } = await this.assets.resolveFile(assetId, workspaceId, user.sub);
    if (!existsSync(path)) return res.status(404).send("Not found");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    createReadStream(path).pipe(res);
  }
}
