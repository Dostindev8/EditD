import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Asset, AssetSchema } from "./asset.schema.js";
import { AssetService } from "./asset.service.js";
import { AssetController, AssetFileController } from "./asset.controller.js";
import { WorkspaceModule } from "../workspaces/workspace.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    AuthModule,
    WorkspaceModule,
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
  ],
  controllers: [AssetController, AssetFileController],
  providers: [AssetService],
  exports: [AssetService, MongooseModule],
})
export class AssetModule {}
