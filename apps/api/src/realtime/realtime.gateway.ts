import { Injectable } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import type { GenerationSocketEvent } from "../generation/generation.types.js";

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed = [
        ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
        ...(process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","),
      ]
        .map((s) => s.trim())
        .filter(Boolean);
      try {
        const host = new URL(origin).hostname;
        const ok =
          allowed.includes("*") ||
          allowed.includes(origin) ||
          (process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1"));
        return callback(ok ? null : new Error("CORS origin denied"), ok);
      } catch {
        return callback(new Error("CORS origin denied"), false);
      }
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
@Injectable()
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  private room(workspaceId: string, projectId: string) {
    return `ws:${workspaceId}:proj:${projectId}`;
  }

  @SubscribeMessage("join:project")
  handleJoin(
    @MessageBody() data: { workspaceId?: string; projectId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.workspaceId || !data.projectId) return { ok: false };
    const room = this.room(data.workspaceId, data.projectId);
    void client.join(room);
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
