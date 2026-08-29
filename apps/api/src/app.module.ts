import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { WorkspaceModule } from "./workspaces/workspace.module.js";
import { ProjectModule } from "./projects/project.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { HealthController } from "./health.controller.js";
import { CacheModule } from "./cache/cache.module.js";
import { BillingModule } from "./billing/billing.module.js";
import { AssetModule } from "./assets/asset.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";
import { GenerationModule } from "./generation/generation.module.js";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lcs_dominican",
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60000, limit: 120 }],
      getTracker: (req) => {
        const ip = (req.ips?.[0] || req.ip || "unknown").toString();
        return ip.includes(":") ? ip.replace(/^.*:/, "ip6:") : `ip4:${ip}`;
      },
    }),
    CacheModule,
    BillingModule,
    RealtimeModule,
    AssetModule,
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    ChatModule,
    GenerationModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
