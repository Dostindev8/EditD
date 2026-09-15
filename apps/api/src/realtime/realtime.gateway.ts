import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Model } from "mongoose";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import type { GenerationSocketEvent } from "../generation/generation.types.js";
import { getJwtPublicKey } from "../auth/jwt-keys.js";
import type { AccessPayload } from "../auth/jwt.guard.js";
import { User, UserDocument } from "../users/user.schema.js";
import { IsolationService } from "../workspaces/isolation.service.js";

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

function isAllowedSocketOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Browsers always send Origin on cross-site WS; deny missing Origin in production.
    return process.env.NODE_ENV !== "production";
  }
  const allowed = [
    ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
    ...(process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const host = new URL(origin).hostname;
    return (
      allowed.includes("*") ||
      allowed.includes(origin) ||
      (process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const ok = isAllowedSocketOrigin(origin);
      return callback(ok ? null : new Error("CORS origin denied"), ok);
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
@Injectable()
export class RealtimeGateway {
  private readonly log = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(IsolationService) private isolation: IsolationService,
    @InjectModel(User.name) private users: Model<UserDocument>,
  ) {}

  private room(workspaceId: string, projectId: string) {
    return `ws:${workspaceId}:proj:${projectId}`;
  }

  private async authenticateSocket(client: Socket): Promise<AccessPayload | null> {
    const token = parseCookie(client.handshake.headers.cookie, "lcs_access");
    if (!token) return null;
    try {
      const payload = jwt.verify(token, getJwtPublicKey(), {
        algorithms: ["RS256"],
      }) as AccessPayload;
      const user = await this.users.findById(payload.sub).select("tokenVersion").lean();
      if (!user || user.tokenVersion !== payload.tv) return null;
      return payload;
    } catch {
      return null;
    }
  }

  @SubscribeMessage("join:project")
  async handleJoin(
    @MessageBody() data: { workspaceId?: string; projectId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.workspaceId || !data.projectId) return { ok: false, error: "missing_ids" };

    const user = await this.authenticateSocket(client);
    if (!user) {
      this.log.warn(`join:project denied — unauthenticated socket ${client.id}`);
      return { ok: false, error: "unauthorized" };
    }

    try {
      await this.isolation.getProjectInWorkspace(user.sub, data.workspaceId, data.projectId);
    } catch {
      this.log.warn(
        `join:project denied — user=${user.sub} ws=${data.workspaceId} proj=${data.projectId}`,
      );
      return { ok: false, error: "forbidden" };
    }

    const room = this.room(data.workspaceId, data.projectId);
    await client.join(room);
    return { ok: true, room };
  }

  emitGenerationEvent(
    workspaceId: string,
    projectId: string,
    event: GenerationSocketEvent,
    payload: Record<string, unknown>,
  ) {
    if (!this.server) return;
    this.server.to(this.room(workspaceId, projectId)).emit(event, payload);
  }
}
