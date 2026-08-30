import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import type { Response } from "express";
import { User, UserDocument } from "../users/user.schema.js";
import { Workspace, WorkspaceDocument } from "../workspaces/workspace.schema.js";
import { Project, ProjectDocument } from "../projects/project.schema.js";
import { RefreshSession, RefreshSessionDocument } from "./refresh-session.schema.js";
import { getJwtPrivateKey } from "./jwt-keys.js";
import type { AccessPayload } from "./jwt.guard.js";

const ARGON = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(Workspace.name) private workspaces: Model<WorkspaceDocument>,
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
    @InjectModel(RefreshSession.name) private sessions: Model<RefreshSessionDocument>,
  ) {}

  private cookieOpts() {
    const isProd = process.env.NODE_ENV === "production";
    const sameSite = (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || (isProd ? "none" : "lax");
    const secure = process.env.COOKIE_SECURE === "true" || isProd || sameSite === "none";
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    };
  }

  private hashToken(raw: string) {
    return createHash("sha256").update(raw).digest("hex");
  }

  private signAccess(user: UserDocument) {
    const payload: AccessPayload = { sub: String(user._id), email: user.email, tv: user.tokenVersion };
    return jwt.sign(payload, getJwtPrivateKey(), {
      algorithm: "RS256",
      expiresIn: Number(process.env.ACCESS_TOKEN_TTL ?? 900),
    });
  }

  private setCookies(res: Response, access: string, refresh: string) {
    const base = this.cookieOpts();
    res.cookie("lcs_access", access, {
      ...base,
      maxAge: Number(process.env.ACCESS_TOKEN_TTL ?? 900) * 1000,
    });
    res.cookie("lcs_refresh", refresh, {
      ...base,
      maxAge: Number(process.env.REFRESH_TOKEN_TTL ?? 604800) * 1000,
      path: "/api/auth",
    });
  }

  private clearCookies(res: Response) {
    const base = this.cookieOpts();
    res.clearCookie("lcs_access", { ...base });
    res.clearCookie("lcs_refresh", { ...base, path: "/api/auth" });
  }

  async register(email: string, password: string, name: string, res: Response) {
    const exists = await this.users.findOne({ email: email.toLowerCase() });
    if (exists) throw new ConflictException("Ese correo ya está registrado");
    const passwordHash = await argon2.hash(password, ARGON);
    const user = await this.users.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      workspaceIds: [],
    });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${String(user._id).slice(-6)}`;
    const ws = await this.workspaces.create({
      name: `${name} · Studio`,
      slug,
      members: [{ userId: String(user._id), role: "owner" }],
      monthlyBudgetCents: 50000,
    });
    await this.projects.create({ workspaceId: ws._id, name: "Proyecto inicial", assetIds: [] });
    user.workspaceIds = [String(ws._id)];
    await user.save();
    return this.issueSession(user, res);
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.users.findOne({ email: email.toLowerCase() });
    if (!user) throw new UnauthorizedException("Credenciales inválidas");
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("Credenciales inválidas");
    return this.issueSession(user, res);
  }

  async issueSession(user: UserDocument, res: Response) {
    const familyId = randomUUID();
    const refreshRaw = randomUUID() + randomUUID();
    const ttl = Number(process.env.REFRESH_TOKEN_TTL ?? 604800);
    await this.sessions.create({
      userId: String(user._id),
      familyId,
      tokenHash: this.hashToken(refreshRaw),
      expiresAt: new Date(Date.now() + ttl * 1000),
      revoked: false,
    });
    const refresh = `${familyId}.${refreshRaw}`;
    this.setCookies(res, this.signAccess(user), refresh);
    return {
      user: { id: String(user._id), email: user.email, name: user.name },
    };
  }

  async refresh(cookie: string | undefined, res: Response) {
    if (!cookie || !cookie.includes(".")) throw new UnauthorizedException("Refresh ausente");
    const [familyId, raw] = cookie.split(".");
    const session = await this.sessions.findOne({ familyId });
    if (!session || session.revoked) {
      if (session) {
        await this.sessions.updateMany({ familyId }, { revoked: true });
      }
      this.clearCookies(res);
      throw new UnauthorizedException("Sesión revocada");
    }
    if (session.tokenHash !== this.hashToken(raw) || session.expiresAt < new Date()) {
      session.revoked = true;
      await session.save();
      this.clearCookies(res);
      throw new UnauthorizedException("Refresh inválido");
    }
    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException("Usuario no encontrado");
    session.revoked = true;
    await session.save();
    return this.issueSession(user, res);
  }

  async logout(cookie: string | undefined, res: Response) {
    if (cookie?.includes(".")) {
      const familyId = cookie.split(".")[0];
      await this.sessions.updateMany({ familyId }, { revoked: true });
    }
    this.clearCookies(res);
    return { ok: true };
  }

  async revokeAll(userId: string, res: Response) {
    await this.users.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    await this.sessions.updateMany({ userId }, { revoked: true });
    this.clearCookies(res);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new UnauthorizedException();
    return { id: String(user._id), email: user.email, name: user.name };
  }
}
