import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { User, UserDocument } from "../users/user.schema.js";
import { Workspace, WorkspaceDocument } from "../workspaces/workspace.schema.js";
import { Project, ProjectDocument } from "../projects/project.schema.js";

const ARGON = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

type AdminSeedSpec = {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
  projectName: string;
  slug: string;
};

function requireEnvOrDevSecret(envKey: string, log: Logger): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${envKey} no está definida en producción. Define un secreto fuerte antes de arrancar.`,
    );
  }

  const generated = randomBytes(24).toString("base64url");
  log.warn(
    `${envKey} ausente — contraseña de desarrollo generada (única por arranque): ${generated}`,
  );
  return generated;
}

function buildAdminSpecs(log: Logger): AdminSeedSpec[] {
  return [
    {
      email: (process.env.ADMIN_EMAIL ?? "admin@editd.ai").toLowerCase(),
      password: requireEnvOrDevSecret("ADMIN_PASSWORD", log),
      name: process.env.ADMIN_NAME ?? "editD Master Admin",
      workspaceName: "editD Master Studio",
      projectName: "Producción Principal",
      slug: "editd-master-studio",
    },
    {
      email: (process.env.ADMIN_EMAIL_LCS ?? "admin@logiccodespot.com").toLowerCase(),
      password: requireEnvOrDevSecret("ADMIN_PASSWORD_LCS", log),
      name: "Logic Code Spot Admin",
      workspaceName: "LCS Collaboration Studio",
      projectName: "Proyectos Audiovisuales",
      slug: "lcs-collab-studio",
    },
  ];
}

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly log = new Logger(AdminSeedService.name);

  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmins();
  }

  async seedDefaultAdmins() {
    const admins = buildAdminSpecs(this.log);
    for (const admin of admins) {
      try {
        const existing = await this.users.findOne({ email: admin.email.toLowerCase() });
        if (!existing) {
          const passwordHash = await argon2.hash(admin.password, ARGON);
          const user = await this.users.create({
            email: admin.email.toLowerCase(),
            name: admin.name,
            passwordHash,
            workspaceIds: [],
          });

          const ws = await this.workspaces.create({
            name: admin.workspaceName,
            slug: `${admin.slug}-${String(user._id).slice(-4)}`,
            members: [{ userId: String(user._id), role: "owner" }],
            monthlyBudgetCents: 1000000,
          });

          await this.projects.create({
            workspaceId: ws._id as Types.ObjectId,
            name: admin.projectName,
            assetIds: [],
          });

          user.workspaceIds = [String(ws._id)];
          await user.save();
          this.log.log(`Admin account seeded successfully: ${admin.email}`);
        } else if (!existing.workspaceIds || existing.workspaceIds.length === 0) {
          let ws = await this.workspaces.findOne({ "members.userId": String(existing._id) });
          if (!ws) {
            ws = await this.workspaces.create({
              name: admin.workspaceName,
              slug: `${admin.slug}-${String(existing._id).slice(-4)}`,
              members: [{ userId: String(existing._id), role: "owner" }],
              monthlyBudgetCents: 1000000,
            });
          }
          const proj = await this.projects.findOne({ workspaceId: ws._id });
          if (!proj) {
            await this.projects.create({
              workspaceId: ws._id as Types.ObjectId,
              name: admin.projectName,
              assetIds: [],
            });
          }
          existing.workspaceIds = [String(ws._id)];
          await existing.save();
        }
      } catch (err) {
        if (process.env.NODE_ENV === "production") throw err;
        this.log.warn(`Seed admin check error for ${admin.email}: ${(err as Error).message}`);
      }
    }
  }
}
