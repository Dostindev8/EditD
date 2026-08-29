import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { JwtGuard } from "./jwt.guard.js";
import { AdminSeedService } from "./admin-seed.service.js";
import { User, UserSchema } from "../users/user.schema.js";
import { Workspace, WorkspaceSchema } from "../workspaces/workspace.schema.js";
import { Project, ProjectSchema } from "../projects/project.schema.js";
import { RefreshSession, RefreshSessionSchema } from "./refresh-session.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, AdminSeedService],
  exports: [JwtGuard, AuthService, AdminSeedService, MongooseModule],
})
export class AuthModule {}
