import { Global, Module } from "@nestjs/common";
import { WorkspaceModule } from "../workspaces/workspace.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Global()
@Module({
  imports: [WorkspaceModule, AuthModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
