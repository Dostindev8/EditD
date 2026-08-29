import { Module } from "@nestjs/common";
import { CreatorService } from "./creator.service.js";
import { AssetModule } from "../assets/asset.module.js";

@Module({
  imports: [AssetModule],
  providers: [CreatorService],
  exports: [CreatorService],
})
export class CreatorModule {}
